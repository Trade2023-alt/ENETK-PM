# ENETK & EH Systems - Desktop Quote Generator

A comprehensive desktop application for generating professional quotes for EH products with ENETK branding. Built with Python and tkinter for a native desktop experience.

## 🚀 Features

### Core Functionality
- **Multi-format Import**: Import data from Excel (.xlsx), RTF (.rtf), XML (.xml), and CSV (.csv) files
- **Professional Quote Generation**: Create branded quotes with ENETK & EH Systems styling
- **Dual Export Options**: Export to both Excel (.xlsx) and PDF (.pdf) formats
- **Real-time Preview**: Live preview of quote content before export
- **Flexible Pricing**: Configurable markup and tax percentages

### User Interface
- **Tabbed Interface**: Organized into Quote Details, Line Items, Preview, and Settings tabs
- **Modern Design**: Clean, professional interface with ENETK branding
- **Drag & Drop Support**: Easy file import with visual feedback
- **Data Validation**: Input validation and error handling
- **Status Updates**: Real-time status updates and progress indicators

### Quote Management
- **Line Item Management**: Add, edit, remove, and reorder line items
- **Customer Information**: Complete customer and project details
- **Address Management**: Separate billing and shipping addresses
- **Terms & Conditions**: Customizable payment and delivery terms
- **Pricing Calculations**: Automatic subtotal, tax, and total calculations

## 📋 Installation

### Prerequisites
- Python 3.7 or higher
- Windows, macOS, or Linux

### Quick Start
1. **Download the files** to a folder on your computer
2. **Run the launcher**:
   ```bash
   python run_desktop_quote_generator.py
   ```
   The launcher will automatically install required dependencies.

### Manual Installation
If you prefer to install dependencies manually:
```bash
pip install openpyxl pandas reportlab
```

## 🎯 Usage

### Starting the Application
1. Run `python run_desktop_quote_generator.py`
2. The application will start with a clean interface
3. Begin by filling in quote details or importing data

### Importing Data
1. Go to the **Line Items** tab
2. Click one of the import buttons:
   - **Import Excel File**: For .xlsx and .xls files
   - **Import RTF File**: For .rtf files
   - **Import XML File**: For .xml files
   - **Import CSV File**: For .csv files
3. Select your file and the data will be automatically parsed

### Adding Line Items
1. Click **Add Item** in the Line Items tab
2. Fill in the item details:
   - Description (required)
   - Model number
   - Order code
   - Quantity
   - Unit (EA, PC, SET, etc.)
   - Unit price
   - Configuration/notes
3. Click **Save** to add the item

### Generating Quotes
1. Fill in all required information in the **Quote Details** tab
2. Add line items in the **Line Items** tab
3. Review the **Preview** tab to see your quote
4. Click **Generate Excel Quote** or **Generate PDF Quote**
5. Choose where to save the file

## 📁 File Structure

```
desktop_quote_generator/
├── desktop_quote_generator.py    # Main application
├── file_parsers.py              # File import parsers
├── dialogs.py                   # Dialog windows
├── exporters.py                 # Excel/PDF export modules
├── run_desktop_quote_generator.py # Launcher script
├── requirements.txt             # Dependencies
└── DESKTOP_QUOTE_GENERATOR_README.md
```

## 🔧 Configuration

### Settings Tab
- **Markup Percentage**: Default markup applied to unit prices
- **Tax Percentage**: Tax rate applied to subtotal
- **Company Information**: Customize company details

### Supported File Formats

#### Excel Files (.xlsx, .xls)
- Automatically detects columns for description, quantity, price
- Supports multiple sheet formats
- Handles various data layouts

#### RTF Files (.rtf)
- Parses RTF formatting codes
- Extracts item descriptions and pricing
- Handles complex RTF structures

#### XML Files (.xml)
- Flexible XML parsing
- Supports various XML schemas
- Extracts product information

#### CSV Files (.csv)
- Column mapping for different formats
- Automatic data type detection
- Header row handling

## 🎨 Branding

The application features professional ENETK & EH Systems branding:
- **Company Colors**: ENETK blue (#366092) and teal accent (#16A085)
- **Professional Layout**: Clean, business-appropriate design
- **Consistent Styling**: Matches corporate identity standards

## 📊 Export Formats

### Excel Export
- Professional formatting with company branding
- Automatic column sizing and alignment
- Currency formatting for prices
- Print-ready layout

### PDF Export
- High-quality PDF generation
- Professional typography
- Company branding and colors
- Optimized for printing and email

## 🛠️ Troubleshooting

### Common Issues

**Application won't start:**
- Ensure Python 3.7+ is installed
- Check that all dependencies are installed
- Verify all files are in the same directory

**Import errors:**
- Check file format is supported
- Ensure file is not corrupted
- Try a different file format

**Export errors:**
- Ensure you have write permissions to the save location
- Check that the file path is valid
- Try saving to a different location

### Getting Help
1. Check the error messages in the status bar
2. Verify your file formats are supported
3. Ensure all required fields are filled
4. Try with sample data first

## 🔄 Updates

The application is designed to be easily extensible:
- Add new file formats by extending the parser classes
- Customize branding by modifying the exporter modules
- Add new features by extending the main application class

## 📝 License

This application is provided for ENETK & EH Systems internal use. All rights reserved.

## 🤝 Support

For technical support or feature requests, contact the development team.

---

**ENETK & EH Systems**  
Professional Industrial Solutions  
*Building the future of industrial automation*
