'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import Papa from 'papaparse';

/**
 * Parses EH Quote data from various formats (RTF text, XML, or Excel logic)
 * Ported and adapted from the existing Python implementation
 */
export async function parseEHQuote(fileContent, fileType) {
    console.log(`Parsing EH quote of type: ${fileType}`);

    let items = [];

    try {
        if (fileType === 'rtf' || fileType === 'txt') {
            items = parseRTFContent(fileContent);
        } else if (fileType === 'xml') {
            items = parseXMLContent(fileContent);
        } else if (fileType === 'csv' || fileType === 'txt' && fileContent.includes(',')) {
            items = parseCSVContent(fileContent);
        } else if (fileType === 'xlsx') {
            return { success: false, error: "XLSX parsing requires server-side processing. Please convert to CSV for now." };
        }

        return { success: true, items };
    } catch (error) {
        console.error("Parsing error:", error);
        return { success: false, error: error.message };
    }
}

function parseRTFContent(content) {
    const items = [];
    const cleanContent = content.replace(/\\[a-z]+\d*\s?/g, '').replace(/[{}]/g, '').replace(/\s+/g, ' ');

    // Split by Item markers or common start patterns
    const chunks = cleanContent.split(/Item\s+\d+/i);

    for (const chunk of chunks) {
        if (!chunk.trim() || chunk.length < 10) continue;

        const item = {
            description: '',
            quantity: 1,
            unit: 'PC',
            unit_price: 0.0,
            model: '',
            order_code: '',
            sales_text: ''
        };

        // Extract Model Number (e.g. FMR63B-...)
        const modelMatch = chunk.match(/Model no\.:\s*([A-Z0-9\-\/]+)/i);
        if (modelMatch) item.model = modelMatch[1].trim();

        // Extract Order Code (e.g. in parentheses)
        const orderMatch = chunk.match(/\((7\d{7})\)/); // EH codes often start with 7 and are 8 digits
        if (orderMatch) item.order_code = orderMatch[1];

        // Extract Price (e.g. 1,234.56 USD)
        const priceMatch = chunk.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s+USD/i);
        if (priceMatch) item.unit_price = parseFloat(priceMatch[1].replace(/,/g, ''));

        // Extract Qty
        const qtyMatch = chunk.match(/(\d+)\s+PC/i);
        if (qtyMatch) item.quantity = parseInt(qtyMatch[1]);

        // Description is usually the text before Model no
        const descParts = chunk.split(/Model no\.:/i);
        item.description = descParts[0].trim().substring(0, 150);

        if (item.model || item.description.length > 5) {
            items.push(item);
        }
    }

    return items;
}

function parseXMLContent(content) {
    const items = [];

    // EH XML often uses <OrderItem> or <Product> tags
    const itemRegex = /<(OrderItem|Product|LineItem)[\s\S]*?<\/\1>/g;
    const matches = content.match(itemRegex);

    if (matches) {
        for (const match of matches) {
            const getTag = (tag) => {
                const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
                const m = match.match(r);
                return m ? m[1].trim().replace(/<!\[CDATA\[|\]\]>/g, '') : '';
            };

            const item = {
                description: getTag('Description') || getTag('Name') || getTag('Text'),
                model: getTag('Model') || getTag('PartNumber') || getTag('ProductCode'),
                quantity: parseInt(getTag('Quantity')) || 1,
                unit: getTag('Unit') || 'PC',
                unit_price: parseFloat(getTag('UnitPrice').replace(/[$,]/g, '')) ||
                    parseFloat(getTag('Price').replace(/[$,]/g, '')) || 0.0,
                order_code: getTag('OrderCode') || getTag('ArticleNumber'),
                config: getTag('Configuration') || getTag('Config')
            };

            if (item.description || item.model) {
                items.push(item);
            }
        }
    }

    return items;
}

function parseCSVContent(content) {
    const results = Papa.parse(content, {
        header: true,
        skipEmptyLines: true
    });

    return results.data.map(row => {
        // Try to find the right columns based on common names
        const keys = Object.keys(row);
        const findKey = (keywords) => keys.find(k => keywords.some(kw => k.toLowerCase().includes(kw)));

        const descKey = findKey(['description', 'product', 'name', 'item']);
        const modelKey = findKey(['model', 'part', 'sku', 'material']);
        const qtyKey = findKey(['qty', 'quantity', 'amount']);
        const priceKey = findKey(['price', 'cost', 'unit price']);
        const codeKey = findKey(['order code', 'code', 'material number']);

        return {
            description: row[descKey] || 'Imported Item',
            model: row[modelKey] || '',
            order_code: row[codeKey] || '',
            quantity: parseInt(row[qtyKey]) || 1,
            unit: 'PC',
            unit_price: parseFloat(String(row[priceKey]).replace(/[$,]/g, '')) || 0.0,
            config: row.Configuration || ''
        };
    }).filter(item => item.description.length > 2 || item.model);
}

export async function saveQuote(quoteData, lineItems) {
    try {
        // 1. Prepare clean quote data with correct types
        const cleanQuoteData = {
            ...quoteData,
            total: parseFloat(quoteData.total) || 0,
            markup_percentage: parseFloat(quoteData.markup_percentage) || 0,
            tax_percentage: parseFloat(quoteData.tax_percentage) || 0,
            lead_time_value: parseInt(quoteData.lead_time_value) || 0
        };

        // Add updated_at only if it doesn't cause a crash (resilience)
        // We'll try to insert it, and if it fails due to column missing, we retry without it
        cleanQuoteData.updated_at = new Date().toISOString();

        // Remove ID if it's null/undefined to let Supabase handle insertion
        if (!cleanQuoteData.id) {
            delete cleanQuoteData.id;
        }

        // 2. Insert/Update Quote
        let { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .upsert(cleanQuoteData)
            .select()
            .single();

        // Resilience: If updated_at is missing from schema, retry without it
        if (quoteError && quoteError.message.includes('updated_at')) {
            console.warn("Retrying quote save without updated_at column...");
            delete cleanQuoteData.updated_at;
            const retry = await supabase
                .from('quotes')
                .upsert(cleanQuoteData)
                .select()
                .single();
            quote = retry.data;
            quoteError = retry.error;
        }

        if (quoteError) {
            console.error("Quote table error:", quoteError);
            throw new Error(`Quote Save Failed: ${quoteError.message}`);
        }

        // 3. Insert/Update Line Items
        // First delete existing if we are updating an existing quote
        if (quoteData.id) {
            await supabase.from('quote_items').delete().eq('quote_id', quote.id);
        }

        if (lineItems && lineItems.length > 0) {
            const itemsToInsert = lineItems.map((item, index) => ({
                quote_id: quote.id,
                item_number: index + 1,
                description: item.description || 'Item',
                model: item.model || '',
                order_code: item.order_code || '',
                quantity: parseInt(item.quantity) || 1,
                unit: item.unit || 'PC',
                unit_price: parseFloat(item.unit_price) || 0.0,
                config: item.config || ''
            }));

            const { error: itemsError } = await supabase
                .from('quote_items')
                .insert(itemsToInsert);

            if (itemsError) {
                console.error("Items table error:", itemsError);
                throw new Error(`Items Save Failed: ${itemsError.message}`);
            }
        }

        revalidatePath('/quotes');
        return { success: true, id: quote.id };
    } catch (error) {
        console.error("Critical Save error:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteQuote(id) {
    try {
        const { error } = await supabase.from('quotes').delete().eq('id', id);
        if (error) throw error;
        revalidatePath('/quotes');
        return { success: true };
    } catch (error) {
        console.error("Delete error:", error);
        return { success: false, error: error.message };
    }
}
