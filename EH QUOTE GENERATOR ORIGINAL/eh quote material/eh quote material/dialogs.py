"""
Dialog modules for the Desktop Quote Generator
Handles item addition, editing, and other dialogs
"""

import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime

class ItemDialog:
    """Dialog for adding/editing line items"""
    
    def __init__(self, parent, item_data=None, title="Add Line Item"):
        self.result = None
        self.item_data = item_data or {}
        
        self.dialog = tk.Toplevel(parent)
        self.dialog.title(title)
        self.dialog.geometry("500x400")
        self.dialog.transient(parent)
        self.dialog.grab_set()
        
        # Center the dialog
        self.center_dialog()
        
        self.create_widgets()
        
        # Focus on first entry
        self.desc_entry.focus()
    
    def center_dialog(self):
        """Center the dialog on the parent window"""
        self.dialog.update_idletasks()
        x = (self.dialog.winfo_screenwidth() // 2) - (500 // 2)
        y = (self.dialog.winfo_screenheight() // 2) - (400 // 2)
        self.dialog.geometry(f"500x400+{x}+{y}")
    
    def create_widgets(self):
        """Create dialog widgets"""
        main_frame = ttk.Frame(self.dialog, padding="20")
        main_frame.pack(fill='both', expand=True)
        
        # Description
        ttk.Label(main_frame, text="Description:", font=('Arial', 10, 'bold')).grid(
            row=0, column=0, sticky='w', pady=(0, 5))
        self.desc_var = tk.StringVar(value=self.item_data.get('description', ''))
        self.desc_entry = ttk.Entry(main_frame, textvariable=self.desc_var, width=50)
        self.desc_entry.grid(row=1, column=0, columnspan=2, sticky='ew', pady=(0, 10))
        
        # Model and Order Code
        model_frame = ttk.Frame(main_frame)
        model_frame.grid(row=2, column=0, columnspan=2, sticky='ew', pady=(0, 10))
        model_frame.grid_columnconfigure(1, weight=1)
        model_frame.grid_columnconfigure(3, weight=1)
        
        ttk.Label(model_frame, text="Model:", font=('Arial', 10, 'bold')).grid(
            row=0, column=0, sticky='w', padx=(0, 5))
        self.model_var = tk.StringVar(value=self.item_data.get('model', ''))
        ttk.Entry(model_frame, textvariable=self.model_var, width=20).grid(
            row=0, column=1, sticky='ew', padx=(0, 20))
        
        ttk.Label(model_frame, text="Order Code:", font=('Arial', 10, 'bold')).grid(
            row=0, column=2, sticky='w', padx=(0, 5))
        self.order_code_var = tk.StringVar(value=self.item_data.get('order_code', ''))
        ttk.Entry(model_frame, textvariable=self.order_code_var, width=20).grid(
            row=0, column=3, sticky='ew')
        
        # Quantity, Unit, and Price
        qty_frame = ttk.Frame(main_frame)
        qty_frame.grid(row=3, column=0, columnspan=2, sticky='ew', pady=(0, 10))
        qty_frame.grid_columnconfigure(1, weight=1)
        qty_frame.grid_columnconfigure(3, weight=1)
        qty_frame.grid_columnconfigure(5, weight=1)
        
        ttk.Label(qty_frame, text="Quantity:", font=('Arial', 10, 'bold')).grid(
            row=0, column=0, sticky='w', padx=(0, 5))
        self.qty_var = tk.StringVar(value=str(self.item_data.get('quantity', 1)))
        ttk.Entry(qty_frame, textvariable=self.qty_var, width=10).grid(
            row=0, column=1, sticky='w', padx=(0, 20))
        
        ttk.Label(qty_frame, text="Unit:", font=('Arial', 10, 'bold')).grid(
            row=0, column=2, sticky='w', padx=(0, 5))
        self.unit_var = tk.StringVar(value=self.item_data.get('unit', 'EA'))
        unit_combo = ttk.Combobox(qty_frame, textvariable=self.unit_var, width=8,
                                 values=['EA', 'PC', 'SET', 'FT', 'IN', 'LB', 'KG', 'GAL', 'L'])
        unit_combo.grid(row=0, column=3, sticky='w', padx=(0, 20))
        
        ttk.Label(qty_frame, text="Unit Price:", font=('Arial', 10, 'bold')).grid(
            row=0, column=4, sticky='w', padx=(0, 5))
        self.price_var = tk.StringVar(value=str(self.item_data.get('unit_price', 0.0)))
        ttk.Entry(qty_frame, textvariable=self.price_var, width=15).grid(
            row=0, column=5, sticky='w')
        
        # Configuration/Notes
        ttk.Label(main_frame, text="Configuration/Notes:", font=('Arial', 10, 'bold')).grid(
            row=4, column=0, sticky='w', pady=(10, 5))
        self.config_text = tk.Text(main_frame, height=6, width=50, wrap='word')
        self.config_text.grid(row=5, column=0, columnspan=2, sticky='ew', pady=(0, 10))
        self.config_text.insert('1.0', self.item_data.get('config', ''))
        
        # Buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=6, column=0, columnspan=2, pady=(10, 0))
        
        ttk.Button(button_frame, text="Save", command=self.save_item, 
                  style='Success.TButton').pack(side='left', padx=(0, 10))
        ttk.Button(button_frame, text="Cancel", command=self.cancel, 
                  style='Danger.TButton').pack(side='left')
        
        # Configure grid weights
        main_frame.grid_columnconfigure(0, weight=1)
    
    def save_item(self):
        """Save the item data"""
        if not self.desc_var.get().strip():
            messagebox.showerror("Error", "Description is required!")
            return
        
        try:
            quantity = int(self.qty_var.get())
            unit_price = float(self.price_var.get())
        except ValueError:
            messagebox.showerror("Error", "Quantity and Unit Price must be valid numbers!")
            return
        
        self.result = {
            'description': self.desc_var.get().strip(),
            'model': self.model_var.get().strip(),
            'order_code': self.order_code_var.get().strip(),
            'quantity': quantity,
            'unit': self.unit_var.get().strip(),
            'unit_price': unit_price,
            'config': self.config_text.get('1.0', 'end-1c').strip()
        }
        
        self.dialog.destroy()
    
    def cancel(self):
        """Cancel the dialog"""
        self.dialog.destroy()

class ImportDialog:
    """Dialog for file import options"""
    
    def __init__(self, parent, file_path):
        self.result = None
        self.file_path = file_path
        
        self.dialog = tk.Toplevel(parent)
        self.dialog.title("Import Options")
        self.dialog.geometry("600x500")
        self.dialog.transient(parent)
        self.dialog.grab_set()
        
        self.center_dialog()
        self.create_widgets()
    
    def center_dialog(self):
        """Center the dialog on the parent window"""
        self.dialog.update_idletasks()
        x = (self.dialog.winfo_screenwidth() // 2) - (600 // 2)
        y = (self.dialog.winfo_screenheight() // 2) - (500 // 2)
        self.dialog.geometry(f"600x500+{x}+{y}")
    
    def create_widgets(self):
        """Create dialog widgets"""
        main_frame = ttk.Frame(self.dialog, padding="20")
        main_frame.pack(fill='both', expand=True)
        
        # File info
        ttk.Label(main_frame, text=f"Importing: {self.file_path.split('/')[-1]}", 
                 font=('Arial', 12, 'bold')).pack(anchor='w', pady=(0, 10))
        
        # Column mapping
        mapping_frame = ttk.LabelFrame(main_frame, text="Column Mapping", padding="10")
        mapping_frame.pack(fill='x', pady=(0, 10))
        
        # Create mapping options
        self.mappings = {}
        
        fields = [
            ('description', 'Description'),
            ('model', 'Model/Part Number'),
            ('order_code', 'Order Code/SKU'),
            ('quantity', 'Quantity'),
            ('unit', 'Unit'),
            ('unit_price', 'Unit Price')
        ]
        
        for i, (field, label) in enumerate(fields):
            ttk.Label(mapping_frame, text=f"{label}:").grid(row=i, column=0, sticky='w', pady=2)
            var = tk.StringVar()
            combo = ttk.Combobox(mapping_frame, textvariable=var, width=20)
            combo.grid(row=i, column=1, sticky='w', padx=(10, 0), pady=2)
            self.mappings[field] = (var, combo)
        
        # Import options
        options_frame = ttk.LabelFrame(main_frame, text="Import Options", padding="10")
        options_frame.pack(fill='x', pady=(0, 10))
        
        self.skip_header_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(options_frame, text="Skip first row (header)", 
                       variable=self.skip_header_var).pack(anchor='w')
        
        self.clear_existing_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(options_frame, text="Clear existing items", 
                       variable=self.clear_existing_var).pack(anchor='w')
        
        # Preview area
        preview_frame = ttk.LabelFrame(main_frame, text="Preview", padding="10")
        preview_frame.pack(fill='both', expand=True, pady=(0, 10))
        
        self.preview_text = tk.Text(preview_frame, height=10, width=60, wrap='none')
        preview_scrollbar = ttk.Scrollbar(preview_frame, orient='vertical', command=self.preview_text.yview)
        self.preview_text.configure(yscrollcommand=preview_scrollbar.set)
        
        self.preview_text.pack(side='left', fill='both', expand=True)
        preview_scrollbar.pack(side='right', fill='y')
        
        # Buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill='x')
        
        ttk.Button(button_frame, text="Preview", command=self.preview_data, 
                  style='Primary.TButton').pack(side='left', padx=(0, 10))
        ttk.Button(button_frame, text="Import", command=self.import_data, 
                  style='Success.TButton').pack(side='left', padx=(0, 10))
        ttk.Button(button_frame, text="Cancel", command=self.cancel, 
                  style='Danger.TButton').pack(side='left')
    
    def preview_data(self):
        """Preview the data to be imported"""
        # This would be implemented to show a preview of the parsed data
        self.preview_text.delete('1.0', 'end')
        self.preview_text.insert('1.0', "Preview functionality would be implemented here...")
    
    def import_data(self):
        """Import the data with selected options"""
        self.result = {
            'mappings': {field: var.get() for field, (var, combo) in self.mappings.items()},
            'skip_header': self.skip_header_var.get(),
            'clear_existing': self.clear_existing_var.get()
        }
        self.dialog.destroy()
    
    def cancel(self):
        """Cancel the dialog"""
        self.dialog.destroy()

class SettingsDialog:
    """Dialog for application settings"""
    
    def __init__(self, parent, current_settings):
        self.result = None
        self.current_settings = current_settings
        
        self.dialog = tk.Toplevel(parent)
        self.dialog.title("Settings")
        self.dialog.geometry("400x300")
        self.dialog.transient(parent)
        self.dialog.grab_set()
        
        self.center_dialog()
        self.create_widgets()
    
    def center_dialog(self):
        """Center the dialog on the parent window"""
        self.dialog.update_idletasks()
        x = (self.dialog.winfo_screenwidth() // 2) - (400 // 2)
        y = (self.dialog.winfo_screenheight() // 2) - (300 // 2)
        self.dialog.geometry(f"400x300+{x}+{y}")
    
    def create_widgets(self):
        """Create dialog widgets"""
        main_frame = ttk.Frame(self.dialog, padding="20")
        main_frame.pack(fill='both', expand=True)
        
        # Company Information
        company_frame = ttk.LabelFrame(main_frame, text="Company Information", padding="10")
        company_frame.pack(fill='x', pady=(0, 10))
        
        ttk.Label(company_frame, text="Company Name:").grid(row=0, column=0, sticky='w', pady=2)
        self.company_name_var = tk.StringVar(value=self.current_settings.get('company_name', 'ENETK & EH Systems'))
        ttk.Entry(company_frame, textvariable=self.company_name_var, width=30).grid(
            row=0, column=1, sticky='ew', padx=(10, 0), pady=2)
        
        ttk.Label(company_frame, text="Address:").grid(row=1, column=0, sticky='nw', pady=2)
        self.address_text = tk.Text(company_frame, height=3, width=30)
        self.address_text.grid(row=1, column=1, sticky='ew', padx=(10, 0), pady=2)
        self.address_text.insert('1.0', self.current_settings.get('address', ''))
        
        ttk.Label(company_frame, text="Phone:").grid(row=2, column=0, sticky='w', pady=2)
        self.phone_var = tk.StringVar(value=self.current_settings.get('phone', ''))
        ttk.Entry(company_frame, textvariable=self.phone_var, width=30).grid(
            row=2, column=1, sticky='ew', padx=(10, 0), pady=2)
        
        ttk.Label(company_frame, text="Email:").grid(row=3, column=0, sticky='w', pady=2)
        self.email_var = tk.StringVar(value=self.current_settings.get('email', ''))
        ttk.Entry(company_frame, textvariable=self.email_var, width=30).grid(
            row=3, column=1, sticky='ew', padx=(10, 0), pady=2)
        
        company_frame.grid_columnconfigure(1, weight=1)
        
        # Default Settings
        defaults_frame = ttk.LabelFrame(main_frame, text="Default Settings", padding="10")
        defaults_frame.pack(fill='x', pady=(0, 10))
        
        ttk.Label(defaults_frame, text="Default Markup %:").grid(row=0, column=0, sticky='w', pady=2)
        self.default_markup_var = tk.DoubleVar(value=self.current_settings.get('default_markup', 20.0))
        ttk.Spinbox(defaults_frame, from_=0, to=100, textvariable=self.default_markup_var, 
                   width=10, format="%.1f").grid(row=0, column=1, sticky='w', padx=(10, 0), pady=2)
        
        ttk.Label(defaults_frame, text="Default Tax %:").grid(row=1, column=0, sticky='w', pady=2)
        self.default_tax_var = tk.DoubleVar(value=self.current_settings.get('default_tax', 8.0))
        ttk.Spinbox(defaults_frame, from_=0, to=50, textvariable=self.default_tax_var, 
                   width=10, format="%.1f").grid(row=1, column=1, sticky='w', padx=(10, 0), pady=2)
        
        # Buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill='x')
        
        ttk.Button(button_frame, text="Save", command=self.save_settings, 
                  style='Success.TButton').pack(side='left', padx=(0, 10))
        ttk.Button(button_frame, text="Cancel", command=self.cancel, 
                  style='Danger.TButton').pack(side='left')
    
    def save_settings(self):
        """Save the settings"""
        self.result = {
            'company_name': self.company_name_var.get(),
            'address': self.address_text.get('1.0', 'end-1c'),
            'phone': self.phone_var.get(),
            'email': self.email_var.get(),
            'default_markup': self.default_markup_var.get(),
            'default_tax': self.default_tax_var.get()
        }
        self.dialog.destroy()
    
    def cancel(self):
        """Cancel the dialog"""
        self.dialog.destroy()
