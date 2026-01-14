'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

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
        } else if (fileType === 'xlsx' || fileType === 'csv') {
            // Processing Excel/CSV usually requires a library like papaparse or exceljs
            // If we are on the server, we might need different handling
            items = []; // Placeholder
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
    // Placeholder for XML parsing using a DOM parser or regex
    return [];
}

export async function saveQuote(quoteData, lineItems) {
    try {
        // 1. Insert/Update Quote
        const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .upsert(quoteData)
            .select()
            .single();

        if (quoteError) throw quoteError;

        // 2. Insert/Update Line Items
        // First delete existing if updating
        if (quoteData.id) {
            await supabase.from('quote_items').delete().eq('quote_id', quote.id);
        }

        const itemsToInsert = lineItems.map((item, index) => ({
            ...item,
            quote_id: quote.id,
            item_number: index + 1
        }));

        const { error: itemsError } = await supabase
            .from('quote_items')
            .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        revalidatePath('/quotes');
        return { success: true, id: quote.id };
    } catch (error) {
        console.error("Save error:", error);
        return { success: false, error: error.message };
    }
}
