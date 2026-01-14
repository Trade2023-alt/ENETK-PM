#!/usr/bin/env python3
"""
Desktop Quote Generator for EH Products with ENETK
A comprehensive desktop application for generating professional quotes
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import openpyxl
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from datetime import datetime
import os
import re
import xml.etree.ElementTree as ET
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import base64
from io import BytesIO

class DesktopQuoteGenerator:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("ENETK & EH Systems - Quote Generator")
        self.root.geometry("1200x800")
        self.root.configure(bg='#f0f0f0')
        
        # Set window icon and styling
        self.setup_styling()
        
        # Quote data
        self.quote_data = {
            'quote_number': f"Q-{datetime.now().strftime('%Y%m%d')}-001",
            'quote_date': datetime.now().strftime('%Y-%m-%d'),
            'project_name': '',
            'bill_to': '',
            'ship_to': '',
            'customer_company': '',
            'contact_person': '',
            'phone': '',
            'email': '',
            'customer_ref': '',
            'payment_terms': 'Net 30 Days',
            'delivery_terms': 'FOB Origin',
            'markup_percentage': 20.0,
            'tax_percentage': 8.0,
            'line_items': [],
            # New fields for lead time and quote expiration
            'lead_time_value': 0,
            'lead_time_unit': 'Days',
            'quote_expiration_days': 30,
            'quote_expiration_date': ''
        }
        
        self.create_gui()
    
    def setup_styling(self):
        """Setup application styling and theme"""
        style = ttk.Style()
        style.theme_use('clam')
        
        # Configure custom styles
        style.configure('Title.TLabel', font=('Arial', 16, 'bold'), foreground='#2c3e50')
        style.configure('Header.TLabel', font=('Arial', 12, 'bold'), foreground='#34495e')
        style.configure('Info.TLabel', font=('Arial', 10), foreground='#7f8c8d')
        style.configure('Success.TLabel', font=('Arial', 10), foreground='#27ae60')
        style.configure('Error.TLabel', font=('Arial', 10), foreground='#e74c3c')
        
        # Button styles
        style.configure('Primary.TButton', font=('Arial', 10, 'bold'))
        style.configure('Success.TButton', font=('Arial', 10, 'bold'))
        style.configure('Danger.TButton', font=('Arial', 10, 'bold'))
    
    def create_gui(self):
        """Create the main user interface"""
        # Main container
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.pack(fill='both', expand=True)
        
        # Title section
        self.create_title_section(main_frame)
        
        # Create notebook for tabs
        notebook = ttk.Notebook(main_frame)
        notebook.pack(fill='both', expand=True, pady=(10, 0))
        
        # Create tabs
        self.create_quote_details_tab(notebook)
        self.create_items_tab(notebook)
        self.create_preview_tab(notebook)
        self.create_settings_tab(notebook)
        
        # Status bar
        self.create_status_bar(main_frame)
    
    def create_title_section(self, parent):
        """Create the title and branding section"""
        title_frame = ttk.Frame(parent)
        title_frame.pack(fill='x', pady=(0, 10))
        
        # Company branding
        branding_frame = ttk.Frame(title_frame)
        branding_frame.pack(side='left')
        
        ttk.Label(branding_frame, text="ENETK & EH Systems", 
                 style='Title.TLabel').pack(anchor='w')
        ttk.Label(branding_frame, text="Professional Quote Generator", 
                 style='Info.TLabel').pack(anchor='w')
        
        # Quote info
        quote_info_frame = ttk.Frame(title_frame)
        quote_info_frame.pack(side='right')
        
        ttk.Label(quote_info_frame, text="Quote #:", style='Header.TLabel').pack(side='left')
        self.quote_number_var = tk.StringVar(value=self.quote_data['quote_number'])
        ttk.Entry(quote_info_frame, textvariable=self.quote_number_var, 
                 width=15, font=('Arial', 10, 'bold')).pack(side='left', padx=(5, 0))
        
        ttk.Label(quote_info_frame, text="Date:", style='Header.TLabel').pack(side='left', padx=(20, 0))
        self.quote_date_var = tk.StringVar(value=self.quote_data['quote_date'])
        quote_date_entry = ttk.Entry(quote_info_frame, textvariable=self.quote_date_var, 
                 width=12)
        quote_date_entry.pack(side='left', padx=(5, 0))
        
        # Bind quote date changes to auto-calculate expiration
        self.quote_date_var.trace('w', lambda *args: self.auto_calculate_expiration())
    
    def create_quote_details_tab(self, notebook):
        """Create the quote details tab"""
        details_frame = ttk.Frame(notebook)
        notebook.add(details_frame, text="Quote Details")
        
        # Create scrollable frame
        canvas = tk.Canvas(details_frame, bg='#f0f0f0')
        scrollbar = ttk.Scrollbar(details_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Project Information
        project_frame = ttk.LabelFrame(scrollable_frame, text="Project Information", padding="10")
        project_frame.pack(fill='x', pady=(0, 10))
        
        ttk.Label(project_frame, text="Project Name:").grid(row=0, column=0, sticky='w', pady=2)
        self.project_name_var = tk.StringVar(value=self.quote_data['project_name'])
        ttk.Entry(project_frame, textvariable=self.project_name_var, width=50).grid(row=0, column=1, sticky='ew', padx=(10, 0), pady=2)
        
        project_frame.grid_columnconfigure(1, weight=1)
        
        # Customer Information
        customer_frame = ttk.LabelFrame(scrollable_frame, text="Customer Information", padding="10")
        customer_frame.pack(fill='x', pady=(0, 10))
        
        # Company details
        ttk.Label(customer_frame, text="Company:").grid(row=0, column=0, sticky='w', pady=2)
        self.customer_company_var = tk.StringVar(value=self.quote_data['customer_company'])
        ttk.Entry(customer_frame, textvariable=self.customer_company_var, width=50).grid(row=0, column=1, sticky='ew', padx=(10, 0), pady=2)
        
        ttk.Label(customer_frame, text="Contact Person:").grid(row=1, column=0, sticky='w', pady=2)
        self.contact_person_var = tk.StringVar(value=self.quote_data['contact_person'])
        ttk.Entry(customer_frame, textvariable=self.contact_person_var, width=50).grid(row=1, column=1, sticky='ew', padx=(10, 0), pady=2)
        
        ttk.Label(customer_frame, text="Phone:").grid(row=2, column=0, sticky='w', pady=2)
        self.phone_var = tk.StringVar(value=self.quote_data['phone'])
        ttk.Entry(customer_frame, textvariable=self.phone_var, width=50).grid(row=2, column=1, sticky='ew', padx=(10, 0), pady=2)
        
        ttk.Label(customer_frame, text="Email:").grid(row=3, column=0, sticky='w', pady=2)
        self.email_var = tk.StringVar(value=self.quote_data['email'])
        ttk.Entry(customer_frame, textvariable=self.email_var, width=50).grid(row=3, column=1, sticky='ew', padx=(10, 0), pady=2)
        
        ttk.Label(customer_frame, text="Customer Reference:").grid(row=4, column=0, sticky='w', pady=2)
        self.customer_ref_var = tk.StringVar(value=self.quote_data['customer_ref'])
        ttk.Entry(customer_frame, textvariable=self.customer_ref_var, width=50).grid(row=4, column=1, sticky='ew', padx=(10, 0), pady=2)
        
        customer_frame.grid_columnconfigure(1, weight=1)
        
        # Address Information
        address_frame = ttk.LabelFrame(scrollable_frame, text="Address Information", padding="10")
        address_frame.pack(fill='x', pady=(0, 10))
        
        ttk.Label(address_frame, text="Bill To:").grid(row=0, column=0, sticky='nw', pady=2)
        self.bill_to_text = scrolledtext.ScrolledText(address_frame, height=4, width=50)
        self.bill_to_text.grid(row=0, column=1, sticky='ew', padx=(10, 0), pady=2)
        self.bill_to_text.insert('1.0', self.quote_data['bill_to'])
        
        ttk.Label(address_frame, text="Ship To:").grid(row=1, column=0, sticky='nw', pady=2)
        self.ship_to_text = scrolledtext.ScrolledText(address_frame, height=4, width=50)
        self.ship_to_text.grid(row=1, column=1, sticky='ew', padx=(10, 0), pady=2)
        self.ship_to_text.insert('1.0', self.quote_data['ship_to'])
        
        address_frame.grid_columnconfigure(1, weight=1)
        
        # Terms and Conditions
        terms_frame = ttk.LabelFrame(scrollable_frame, text="Terms and Conditions", padding="10")
        terms_frame.pack(fill='x', pady=(0, 10))
        
        ttk.Label(terms_frame, text="Payment Terms:").grid(row=0, column=0, sticky='w', pady=2)
        self.payment_terms_var = tk.StringVar(value=self.quote_data['payment_terms'])
        ttk.Entry(terms_frame, textvariable=self.payment_terms_var, width=30).grid(row=0, column=1, sticky='ew', padx=(10, 0), pady=2)
        
        ttk.Label(terms_frame, text="Delivery Terms:").grid(row=1, column=0, sticky='w', pady=2)
        self.delivery_terms_var = tk.StringVar(value=self.quote_data['delivery_terms'])
        ttk.Entry(terms_frame, textvariable=self.delivery_terms_var, width=30).grid(row=1, column=1, sticky='ew', padx=(10, 0), pady=2)
        
        terms_frame.grid_columnconfigure(1, weight=1)
        
        # Lead Time and Quote Expiration
        timing_frame = ttk.LabelFrame(scrollable_frame, text="Lead Time & Quote Validity", padding="10")
        timing_frame.pack(fill='x', pady=(0, 10))
        
        # Lead Time
        ttk.Label(timing_frame, text="Estimated Lead Time:").grid(row=0, column=0, sticky='w', pady=2)
        lead_time_input_frame = ttk.Frame(timing_frame)
        lead_time_input_frame.grid(row=0, column=1, sticky='ew', padx=(10, 0), pady=2)
        
        self.lead_time_value_var = tk.StringVar(value=str(self.quote_data['lead_time_value']))
        ttk.Entry(lead_time_input_frame, textvariable=self.lead_time_value_var, width=10).pack(side='left')
        
        self.lead_time_unit_var = tk.StringVar(value=self.quote_data['lead_time_unit'])
        lead_time_unit_combo = ttk.Combobox(lead_time_input_frame, textvariable=self.lead_time_unit_var, 
                                          values=['Days', 'Weeks', 'Months'], width=10, state='readonly')
        lead_time_unit_combo.pack(side='left', padx=(5, 0))
        
        # Quote Expiration
        ttk.Label(timing_frame, text="Quote Valid For:").grid(row=1, column=0, sticky='w', pady=2)
        expiration_input_frame = ttk.Frame(timing_frame)
        expiration_input_frame.grid(row=1, column=1, sticky='ew', padx=(10, 0), pady=2)
        
        self.quote_expiration_days_var = tk.StringVar(value=str(self.quote_data['quote_expiration_days']))
        ttk.Entry(expiration_input_frame, textvariable=self.quote_expiration_days_var, width=10).pack(side='left')
        ttk.Label(expiration_input_frame, text="days").pack(side='left', padx=(5, 0))
        
        # Auto-calculate expiration date
        ttk.Button(expiration_input_frame, text="Calculate Expiration", 
                  command=self.calculate_expiration_date).pack(side='left', padx=(10, 0))
        
        # Display calculated expiration date
        ttk.Label(timing_frame, text="Quote Valid Until:").grid(row=2, column=0, sticky='w', pady=2)
        self.quote_expiration_date_var = tk.StringVar(value=self.quote_data['quote_expiration_date'])
        expiration_display = ttk.Entry(timing_frame, textvariable=self.quote_expiration_date_var, 
                                     width=20, state='readonly')
        expiration_display.grid(row=2, column=1, sticky='ew', padx=(10, 0), pady=2)
        
        timing_frame.grid_columnconfigure(1, weight=1)
        
        # Pack canvas and scrollbar
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
    
    def create_items_tab(self, notebook):
        """Create the line items tab"""
        items_frame = ttk.Frame(notebook)
        notebook.add(items_frame, text="Line Items")
        
        # File import section
        import_frame = ttk.LabelFrame(items_frame, text="Import Data", padding="10")
        import_frame.pack(fill='x', pady=(0, 10))
        
        button_frame = ttk.Frame(import_frame)
        button_frame.pack(fill='x')
        
        ttk.Button(button_frame, text="Import Excel File", 
                  command=self.import_excel_file, style='Primary.TButton').pack(side='left', padx=(0, 10))
        ttk.Button(button_frame, text="Import RTF File", 
                  command=self.import_rtf_file, style='Primary.TButton').pack(side='left', padx=(0, 10))
        ttk.Button(button_frame, text="Import XML File", 
                  command=self.import_xml_file, style='Primary.TButton').pack(side='left', padx=(0, 10))
        ttk.Button(button_frame, text="Import CSV File", 
                  command=self.import_csv_file, style='Primary.TButton').pack(side='left', padx=(0, 10))
        
        # Items table
        table_frame = ttk.LabelFrame(items_frame, text="Line Items", padding="10")
        table_frame.pack(fill='both', expand=True)
        
        # Create treeview for items
        columns = ('Item', 'Description', 'Qty', 'Unit', 'Unit Price', 'Total Price')
        self.items_tree = ttk.Treeview(table_frame, columns=columns, show='headings', height=15)
        
        # Configure columns
        self.items_tree.heading('Item', text='Item #')
        self.items_tree.heading('Description', text='Description')
        self.items_tree.heading('Qty', text='Qty')
        self.items_tree.heading('Unit', text='Unit')
        self.items_tree.heading('Unit Price', text='Unit Price')
        self.items_tree.heading('Total Price', text='Total Price')
        
        self.items_tree.column('Item', width=60, anchor='center')
        self.items_tree.column('Description', width=300, anchor='w')
        self.items_tree.column('Qty', width=60, anchor='center')
        self.items_tree.column('Unit', width=60, anchor='center')
        self.items_tree.column('Unit Price', width=100, anchor='e')
        self.items_tree.column('Total Price', width=100, anchor='e')
        
        # Scrollbars for treeview
        v_scrollbar = ttk.Scrollbar(table_frame, orient='vertical', command=self.items_tree.yview)
        h_scrollbar = ttk.Scrollbar(table_frame, orient='horizontal', command=self.items_tree.xview)
        self.items_tree.configure(yscrollcommand=v_scrollbar.set, xscrollcommand=h_scrollbar.set)
        
        # Pack treeview and scrollbars
        self.items_tree.pack(side='left', fill='both', expand=True)
        v_scrollbar.pack(side='right', fill='y')
        h_scrollbar.pack(side='bottom', fill='x')
        
        # Item management buttons
        button_frame2 = ttk.Frame(items_frame)
        button_frame2.pack(fill='x', pady=(10, 0))
        
        ttk.Button(button_frame2, text="Add Item", 
                  command=self.add_item_dialog, style='Success.TButton').pack(side='left', padx=(0, 10))
        ttk.Button(button_frame2, text="Edit Item", 
                  command=self.edit_item_dialog, style='Primary.TButton').pack(side='left', padx=(0, 10))
        ttk.Button(button_frame2, text="Remove Item", 
                  command=self.remove_item, style='Danger.TButton').pack(side='left', padx=(0, 10))
        ttk.Button(button_frame2, text="Clear All", 
                  command=self.clear_all_items, style='Danger.TButton').pack(side='left', padx=(0, 10))
        
        # Bind double-click to edit
        self.items_tree.bind('<Double-1>', lambda e: self.edit_item_dialog())
    
    def create_preview_tab(self, notebook):
        """Create the preview tab"""
        preview_frame = ttk.Frame(notebook)
        notebook.add(preview_frame, text="Preview & Export")
        
        # Preview area
        preview_area = ttk.LabelFrame(preview_frame, text="Quote Preview", padding="10")
        preview_area.pack(fill='both', expand=True, pady=(0, 10))
        
        self.preview_text = scrolledtext.ScrolledText(preview_area, height=20, width=80, 
                                                     font=('Courier', 9))
        self.preview_text.pack(fill='both', expand=True)
        
        # Export buttons
        export_frame = ttk.Frame(preview_frame)
        export_frame.pack(fill='x')
        
        ttk.Button(export_frame, text="Generate Excel Quote", 
                  command=self.generate_excel_quote, style='Success.TButton').pack(side='left', padx=(0, 10))
        ttk.Button(export_frame, text="Generate PDF Quote", 
                  command=self.generate_pdf_quote, style='Success.TButton').pack(side='left', padx=(0, 10))
        ttk.Button(export_frame, text="Update Preview", 
                  command=self.update_preview, style='Primary.TButton').pack(side='left', padx=(0, 10))
    
    def create_settings_tab(self, notebook):
        """Create the settings tab"""
        settings_frame = ttk.Frame(notebook)
        notebook.add(settings_frame, text="Settings")
        
        # Pricing settings
        pricing_frame = ttk.LabelFrame(settings_frame, text="Pricing Settings", padding="10")
        pricing_frame.pack(fill='x', pady=(0, 10))
        
        ttk.Label(pricing_frame, text="Markup Percentage:").grid(row=0, column=0, sticky='w', pady=2)
        self.markup_var = tk.DoubleVar(value=self.quote_data['markup_percentage'])
        markup_spinbox = ttk.Spinbox(pricing_frame, from_=0, to=100, textvariable=self.markup_var, 
                                    width=10, format="%.1f")
        markup_spinbox.grid(row=0, column=1, sticky='w', padx=(10, 0), pady=2)
        ttk.Label(pricing_frame, text="%").grid(row=0, column=2, sticky='w', padx=(5, 0), pady=2)
        
        ttk.Label(pricing_frame, text="Tax Percentage:").grid(row=1, column=0, sticky='w', pady=2)
        self.tax_var = tk.DoubleVar(value=self.quote_data['tax_percentage'])
        tax_spinbox = ttk.Spinbox(pricing_frame, from_=0, to=50, textvariable=self.tax_var, 
                                 width=10, format="%.1f")
        tax_spinbox.grid(row=1, column=1, sticky='w', padx=(10, 0), pady=2)
        ttk.Label(pricing_frame, text="%").grid(row=1, column=2, sticky='w', padx=(5, 0), pady=2)
        
        # Bind changes to update preview
        self.markup_var.trace('w', lambda *args: self.safe_update_preview())
        self.tax_var.trace('w', lambda *args: self.safe_update_preview())
    
    def create_status_bar(self, parent):
        """Create the status bar"""
        self.status_frame = ttk.Frame(parent)
        self.status_frame.pack(fill='x', pady=(10, 0))
        
        self.status_label = ttk.Label(self.status_frame, text="Ready", style='Info.TLabel')
        self.status_label.pack(side='left')
        
        # Item count
        self.item_count_label = ttk.Label(self.status_frame, text="Items: 0", style='Info.TLabel')
        self.item_count_label.pack(side='right')
    
    def update_status(self, message, style='Info.TLabel'):
        """Update status message"""
        self.status_label.config(text=message, style=style)
        self.root.update_idletasks()
    
    def calculate_expiration_date(self):
        """Calculate quote expiration date based on quote date and expiration days"""
        try:
            # Get quote date
            quote_date_str = self.quote_date_var.get()
            if not quote_date_str:
                quote_date_str = datetime.now().strftime('%Y-%m-%d')
            
            # Parse quote date
            if '/' in quote_date_str:
                quote_dt = datetime.strptime(quote_date_str, '%m/%d/%Y')
            elif '-' in quote_date_str:
                quote_dt = datetime.strptime(quote_date_str, '%Y-%m-%d')
            else:
                quote_dt = datetime.now()
            
            # Get expiration days
            expiration_days = int(self.quote_expiration_days_var.get())
            
            # Calculate expiration date
            from datetime import timedelta
            expiration_dt = quote_dt + timedelta(days=expiration_days)
            expiration_date_str = expiration_dt.strftime('%m/%d/%Y')
            
            # Update the display
            self.quote_expiration_date_var.set(expiration_date_str)
            
            # Update quote data
            self.quote_data['quote_expiration_days'] = expiration_days
            self.quote_data['quote_expiration_date'] = expiration_date_str
            
            self.update_status(f"Expiration date calculated: {expiration_date_str}", 'Success.TLabel')
            
        except ValueError as e:
            self.update_status(f"Error calculating expiration date: {str(e)}", 'Error.TLabel')
            messagebox.showerror("Error", f"Invalid date format or expiration days. Please check your inputs.\nError: {str(e)}")
    
    def auto_calculate_expiration(self):
        """Automatically calculate expiration date when quote date changes"""
        try:
            # Only calculate if we have valid inputs
            quote_date_str = self.quote_date_var.get()
            expiration_days_str = self.quote_expiration_days_var.get()
            
            if quote_date_str and expiration_days_str and expiration_days_str.isdigit():
                self.calculate_expiration_date()
        except:
            # Silently handle errors during auto-calculation
            pass
    
    def update_item_count(self):
        """Update item count in status bar"""
        count = len(self.quote_data['line_items'])
        self.item_count_label.config(text=f"Items: {count}")
    
    def add_sample_items(self):
        """Add sample items for testing"""
        sample_items = [
            {
                'description': 'Micropilot FMR63B - Level Radar Sensor',
                'model': 'FMR63B-9XA0/0',
                'order_code': '71524852',
                'quantity': 1,
                'unit': 'PC',
                'unit_price': 4050.83,
                'config': '2-wire 4-20mA HART, Segment display, Bluetooth, Alu coated housing'
            },
            {
                'description': 'Micropilot FMR60B - Level Radar Sensor',
                'model': 'FMR60B-1JQQ7/0',
                'order_code': '71524847',
                'quantity': 1,
                'unit': 'PC',
                'unit_price': 3850.50,
                'config': '2-wire 4-20mA HART, Segment display, Bluetooth, Alu coated housing'
            }
        ]
        
        for item in sample_items:
            self.add_item_to_tree(item)
        
        self.update_item_count()
        self.update_preview()
    
    def import_excel_file(self):
        """Import Excel file"""
        file_path = filedialog.askopenfilename(
            title="Select Excel File",
            filetypes=[("Excel Files", "*.xlsx *.xls"), ("All Files", "*.*")]
        )
        if file_path:
            self.import_file(file_path, 'xlsx')
    
    def import_rtf_file(self):
        """Import RTF file"""
        file_path = filedialog.askopenfilename(
            title="Select RTF File",
            filetypes=[("RTF Files", "*.rtf"), ("All Files", "*.*")]
        )
        if file_path:
            self.import_file(file_path, 'rtf')
    
    def import_xml_file(self):
        """Import XML file"""
        file_path = filedialog.askopenfilename(
            title="Select XML File",
            filetypes=[("XML Files", "*.xml"), ("All Files", "*.*")]
        )
        if file_path:
            self.import_file(file_path, 'xml')
    
    def import_csv_file(self):
        """Import CSV file"""
        file_path = filedialog.askopenfilename(
            title="Select CSV File",
            filetypes=[("CSV Files", "*.csv"), ("All Files", "*.*")]
        )
        if file_path:
            self.import_file(file_path, 'csv')
    
    def import_file(self, file_path, file_type):
        """Import file and parse data"""
        try:
            from file_parsers import get_parser
            
            parser = get_parser(file_path)
            items = parser.parse(file_path)
            
            if not items:
                messagebox.showwarning("Import Warning", "No items found in the file.")
                return
            
            # Clear existing items
            self.clear_all_items()
            
            # Add imported items
            for item in items:
                self.add_item_to_tree(item)
            
            self.update_status(f"Imported {len(items)} items from {file_type.upper()} file", 'Success.TLabel')
            self.update_item_count()
            self.update_preview()
            
        except Exception as e:
            messagebox.showerror("Import Error", f"Error importing file: {str(e)}")
            self.update_status("Import failed", 'Error.TLabel')
    
    def add_item_to_tree(self, item):
        """Add item to the tree view"""
        markup = self.markup_var.get() / 100
        TAX_RATE = 0.08
        unit_price = float(item.get('unit_price', 0))
        quantity = int(item.get('quantity', 1))
        price_with_tax = unit_price * (1 + TAX_RATE)
        quoted_price = price_with_tax * (1 + markup)
        total_price = quoted_price * quantity
        
        # Create description with model and order code
        description = item.get('description', '')
        if item.get('model'):
            description += f" | Model: {item['model']}"
        if item.get('order_code'):
            description += f" | Code: {item['order_code']}"
        
        values = (
            len(self.quote_data['line_items']) + 1,
            description,
            quantity,
            item.get('unit', 'EA'),
            f"${quoted_price:.2f}",
            f"${total_price:.2f}"
        )
        
        self.items_tree.insert('', 'end', values=values)
        
        # Add to quote data
        self.quote_data['line_items'].append({
            'description': item.get('description', ''),
            'model': item.get('model', ''),
            'order_code': item.get('order_code', ''),
            'quantity': quantity,
            'unit': item.get('unit', 'EA'),
            'unit_price': unit_price,
            'config': item.get('config', '')
        })
    
    def add_item_dialog(self):
        """Show add item dialog"""
        from dialogs import ItemDialog
        
        dialog = ItemDialog(self.root)
        self.root.wait_window(dialog.dialog)
        
        if dialog.result:
            self.add_item_to_tree(dialog.result)
            self.update_item_count()
            self.update_preview()
    
    def edit_item_dialog(self):
        """Show edit item dialog"""
        selection = self.items_tree.selection()
        if not selection:
            messagebox.showwarning("No Selection", "Please select an item to edit.")
            return
        
        # Get selected item data
        item = self.items_tree.item(selection[0])
        item_index = int(item['values'][0]) - 1
        
        if item_index < len(self.quote_data['line_items']):
            item_data = self.quote_data['line_items'][item_index]
            
            from dialogs import ItemDialog
            dialog = ItemDialog(self.root, item_data, "Edit Line Item")
            self.root.wait_window(dialog.dialog)
            
            if dialog.result:
                # Update the item
                self.quote_data['line_items'][item_index] = dialog.result
                self.refresh_items_tree()
                self.update_preview()
    
    def remove_item(self):
        """Remove selected item"""
        selection = self.items_tree.selection()
        if not selection:
            messagebox.showwarning("No Selection", "Please select an item to remove.")
            return
        
        if messagebox.askyesno("Confirm Removal", "Are you sure you want to remove this item?"):
            item = self.items_tree.item(selection[0])
            item_index = int(item['values'][0]) - 1
            
            if item_index < len(self.quote_data['line_items']):
                del self.quote_data['line_items'][item_index]
                self.refresh_items_tree()
                self.update_item_count()
                self.update_preview()
    
    def clear_all_items(self):
        """Clear all items"""
        if messagebox.askyesno("Confirm Clear", "Are you sure you want to clear all items?"):
            for item in self.items_tree.get_children():
                self.items_tree.delete(item)
            self.quote_data['line_items'] = []
            self.update_item_count()
            self.update_preview()
    
    def refresh_items_tree(self):
        """Refresh the items tree view"""
        # Clear existing items
        for item in self.items_tree.get_children():
            self.items_tree.delete(item)
        
        # Re-add all items
        for i, item in enumerate(self.quote_data['line_items'], 1):
            markup = self.markup_var.get() / 100
            TAX_RATE = 0.08
            unit_price = float(item.get('unit_price', 0))
            quantity = int(item.get('quantity', 1))
            price_with_tax = unit_price * (1 + TAX_RATE)
            quoted_price = price_with_tax * (1 + markup)
            total_price = quoted_price * quantity
            
            # Create description
            description = item.get('description', '')
            if item.get('model'):
                description += f" | Model: {item['model']}"
            if item.get('order_code'):
                description += f" | Code: {item['order_code']}"
            
            values = (
                i,
                description,
                quantity,
                item.get('unit', 'EA'),
                f"${quoted_price:.2f}",
                f"${total_price:.2f}"
            )
            
            self.items_tree.insert('', 'end', values=values)
    
    def safe_update_preview(self):
        """Safely update preview with error handling"""
        try:
            self.update_preview()
        except Exception as e:
            # Handle Tkinter variable errors gracefully
            print(f"Preview update error: {e}")
    
    def update_preview(self):
        """Update the quote preview"""
        # Update quote data from form
        self.quote_data['quote_number'] = self.quote_number_var.get()
        self.quote_data['quote_date'] = self.quote_date_var.get()
        self.quote_data['project_name'] = self.project_name_var.get()
        self.quote_data['customer_company'] = self.customer_company_var.get()
        self.quote_data['contact_person'] = self.contact_person_var.get()
        self.quote_data['phone'] = self.phone_var.get()
        self.quote_data['email'] = self.email_var.get()
        self.quote_data['customer_ref'] = self.customer_ref_var.get()
        self.quote_data['bill_to'] = self.bill_to_text.get('1.0', 'end-1c')
        self.quote_data['ship_to'] = self.ship_to_text.get('1.0', 'end-1c')
        self.quote_data['payment_terms'] = self.payment_terms_var.get()
        self.quote_data['delivery_terms'] = self.delivery_terms_var.get()
        
        # Safely get numeric values
        try:
            self.quote_data['markup_percentage'] = float(self.markup_var.get()) if self.markup_var.get() else 20.0
        except (ValueError, TypeError):
            self.quote_data['markup_percentage'] = 20.0
            
        try:
            self.quote_data['tax_percentage'] = float(self.tax_var.get()) if self.tax_var.get() else 8.0
        except (ValueError, TypeError):
            self.quote_data['tax_percentage'] = 8.0
        
        # Generate preview text
        preview_text = self.generate_preview_text()
        
        # Update preview
        self.preview_text.delete('1.0', 'end')
        self.preview_text.insert('1.0', preview_text)
    
    def generate_preview_text(self):
        """Generate preview text for the quote"""
        markup = self.quote_data['markup_percentage'] / 100
        TAX_RATE = 0.08
        
        # Calculate totals
        subtotal = 0
        for item in self.quote_data['line_items']:
            unit_price = float(item.get('unit_price', 0))
            quantity = float(item.get('quantity', 1))
            price_with_tax = unit_price * (1 + TAX_RATE)
            quoted_price = price_with_tax * (1 + markup)
            subtotal += quoted_price * quantity
        
        total = subtotal
        
        preview = f"""
ENETK & EH SYSTEMS - QUOTE PREVIEW
{'='*50}

Quote Number: {self.quote_data['quote_number']}
Quote Date: {self.quote_data['quote_date']}
Project: {self.quote_data['project_name']}
Customer Ref: {self.quote_data['customer_ref']}

CUSTOMER INFORMATION:
Company: {self.quote_data['customer_company']}
Contact: {self.quote_data['contact_person']}
Phone: {self.quote_data['phone']}
Email: {self.quote_data['email']}

Bill To: {self.quote_data['bill_to']}
Ship To: {self.quote_data['ship_to']}

LINE ITEMS:
{'Item':<5} {'Description':<40} {'Qty':<5} {'Unit':<5} {'Unit Price':<12} {'Total':<12}
{'-'*80}
"""
        
        for i, item in enumerate(self.quote_data['line_items'], 1):
            unit_price = float(item.get('unit_price', 0))
            quantity = float(item.get('quantity', 1))
            price_with_tax = unit_price * (1 + TAX_RATE)
            quoted_price = price_with_tax * (1 + markup)
            total_price = quoted_price * quantity
            
            description = item.get('description', '')[:35] + '...' if len(item.get('description', '')) > 35 else item.get('description', '')
            
            preview += f"{i:<5} {description:<40} {int(quantity):<5} {item.get('unit', 'EA'):<5} ${quoted_price:<11.2f} ${total_price:<11.2f}\n"
        
        preview += f"""
{'-'*80}
Subtotal: ${subtotal:>11.2f}
TOTAL: ${total:>11.2f}

TERMS AND CONDITIONS:
Payment Terms: {self.quote_data['payment_terms']}
Delivery: {self.quote_data['delivery_terms']}
Lead Time: {self.quote_data.get('lead_time_value', 0)} {self.quote_data.get('lead_time_unit', 'Days')}
Quote Valid Until: {self.quote_data.get('quote_expiration_date', 'TBD')}
"""
        
        return preview
    
    def generate_excel_quote(self):
        """Generate Excel quote"""
        if not self.quote_data['line_items']:
            messagebox.showwarning("No Items", "Please add some line items before generating a quote.")
            return
        
        file_path = filedialog.asksaveasfilename(
            title="Save Excel Quote",
            defaultextension=".xlsx",
            filetypes=[("Excel Files", "*.xlsx"), ("All Files", "*.*")]
        )
        
        if file_path:
            try:
                from exporters import ExcelExporter
                
                exporter = ExcelExporter()
                exporter.export_quote(self.quote_data, file_path)
                
                messagebox.showinfo("Success", f"Excel quote generated successfully!\nSaved as: {file_path}")
                self.update_status("Excel quote generated", 'Success.TLabel')
                
            except Exception as e:
                messagebox.showerror("Export Error", f"Error generating Excel quote: {str(e)}")
                self.update_status("Excel export failed", 'Error.TLabel')
    
    def generate_pdf_quote(self):
        """Generate PDF quote"""
        if not self.quote_data['line_items']:
            messagebox.showwarning("No Items", "Please add some line items before generating a quote.")
            return
        
        file_path = filedialog.asksaveasfilename(
            title="Save PDF Quote",
            defaultextension=".pdf",
            filetypes=[("PDF Files", "*.pdf"), ("All Files", "*.*")]
        )
        
        if file_path:
            try:
                from exporters import PDFExporter
                
                exporter = PDFExporter()
                exporter.export_quote(self.quote_data, file_path)
                
                messagebox.showinfo("Success", f"PDF quote generated successfully!\nSaved as: {file_path}")
                self.update_status("PDF quote generated", 'Success.TLabel')
                
            except Exception as e:
                messagebox.showerror("Export Error", f"Error generating PDF quote: {str(e)}")
                self.update_status("PDF export failed", 'Error.TLabel')
    
    def run(self):
        """Run the application"""
        self.update_preview()
        self.root.mainloop()

if __name__ == "__main__":
    app = DesktopQuoteGenerator()
    app.run()
