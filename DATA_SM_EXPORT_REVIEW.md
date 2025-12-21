# DATA SM Export Format Review

## Current Implementation Overview

The DATA SM feature exports sensor monitoring data with custom field mapping. It supports both **manual export** and **automated scheduled exports**.

---

## Current Export Format

### File Format
- **Extension**: `.pfsl`
- **Content Type**: CSV (semicolon-delimited)
- **Delimiter**: `;` (semicolon)
- **Encoding**: UTF-8

### Current Field Mapping

**Frontend** (`frontend/src/pages/DataSM.js:59-71`):
```javascript
const fieldMapping = {
  deviceImei: 'IMEI',
  datetime: 'Timestamp',
  latitude: 'Lat',
  longitude: 'Lon',
  altitude: 'Alt',
  satellites: 'Satellite',
  speed: 'Speed',
  userData0: 'Sensor Kiri',
  userData1: 'Sensor Kanan',
  modbus0: 'Sensor Serial (Ultrasonic)',
  userData2: 'Uptime Seconds'
};
```

### Current CSV Format

**Structure**:
```
IMEI;Timestamp;Lat;Lon;Alt;Satellite;Speed;Sensor Kiri;Sensor Kanan;Sensor Serial (Ultrasonic);Uptime Seconds
123456789012345;01-01-2025 12:30:45;-6.123456;106.789012;100;12;50;123;456;789;3600
```

**Characteristics**:
- ✅ No quotes around values
- ✅ Semicolon (`;`) delimiter
- ✅ Date format: `DD-MM-YYYY HH:MM:SS`
- ✅ Empty values are represented as empty strings
- ✅ Headers use custom names from `fieldMapping`

---

## Implementation Locations

### 1. Manual Export
**Backend Route**: `backend/src/routes/records.js:304-573`
- Endpoint: `POST /api/records/export-sm`
- Generates single file for selected devices
- Filename format: `{GroupName}_{DeviceName}_{DD-MM-YYYY}.pfsl`

**Key Code Sections**:
```516:526:backend/src/routes/records.js
// Generate CSV with custom headers - Manual approach to avoid quotes
const headers = Object.values(customHeaders);
let csv = headers.join(';') + '\n';

transformedData.forEach(row => {
    const values = headers.map(header => {
        const value = row[header];
        return value !== null && value !== undefined ? value : '';
    });
    csv += values.join(';') + '\n';
});
```

**Date Formatting**:
```467:480:backend/src/routes/records.js
case 'datetime':
    // Format date as DD-MM-YYYY HH:MM:SS
    if (record.datetime) {
        const date = new Date(record.datetime);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        transformed[customHeaders[field]] = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
    } else {
        transformed[customHeaders[field]] = '';
    }
    break;
```

### 2. Auto Export
**Backend Route**: `backend/src/routes/autoExport.js:198-400`
- Function: `performDataSMAutoExport()`
- Generates **separate files per device**
- Runs daily at configured UTC time
- Exports previous day's data

**Key Differences from Manual Export**:
- Processes each device separately
- Creates individual file per device
- Uses same CSV format and date formatting
- Filename: `{GroupName}_{DeviceName}_{DD-MM-YYYY}.pfsl`

**Auto Export CSV Generation**:
```344:354:backend/src/routes/autoExport.js
// Generate CSV with custom headers - Manual approach to avoid quotes (same as manual export)
const headers = Object.values(customHeaders);
let csv = headers.join(';') + '\n';

transformedData.forEach(row => {
    const values = headers.map(header => {
        const value = row[header];
        return value !== null && value !== undefined ? value : '';
    });
    csv += values.join(';') + '\n';
});
```

### 3. Frontend Export Handler
**Frontend**: `frontend/src/pages/DataSM.js:184-226`
- Calls `/api/records/export-sm` endpoint
- Sends field mapping and custom headers
- Downloads file with `.pfsl` extension

---

## Current Format Details

### Date/Time Format
- **Format**: `DD-MM-YYYY HH:MM:SS`
- **Example**: `01-01-2025 12:30:45`
- **Timezone**: UTC (stored in database)

### Delimiter
- **Character**: Semicolon (`;`)
- **Reason**: Common in European CSV formats, avoids comma issues in decimal numbers

### Field Order
1. IMEI
2. Timestamp
3. Lat
4. Lon
5. Alt
6. Satellite
7. Speed
8. Sensor Kiri (userData0)
9. Sensor Kanan (userData1)
10. Sensor Serial (Ultrasonic) (modbus0)
11. Uptime Seconds (userData2)

### Data Filtering
Records are filtered to exclude entries with only IMEI and timestamp:
```441:453:backend/src/routes/records.js
// Filter out records that only have IMEI and timestamp (no meaningful data)
const filteredRecords = records.filter(record => {
    const hasGPS = record.latitude !== null && record.latitude !== undefined && 
                  record.longitude !== null && record.longitude !== undefined;
    const hasAltitude = record.altitude !== null && record.altitude !== undefined;
    const hasSatellites = record.satellites !== null && record.satellites !== undefined;
    const hasSpeed = record.speed !== null && record.speed !== undefined;
    const hasSensorData = (record.userData0 !== null && record.userData0 !== undefined) ||
                        (record.userData1 !== null && record.userData1 !== undefined) ||
                        (record.userData2 !== null && record.userData2 !== undefined) ||
                        (record.modbus0 !== null && record.modbus0 !== undefined);
    
    return hasGPS || hasAltitude || hasSatellites || hasSpeed || hasSensorData;
});
```

---

## Possible Format Changes

### 1. **File Extension**
Currently: `.pfsl`
Options:
- `.csv` - Standard CSV extension
- `.txt` - Plain text
- `.xlsx` - Excel format (requires library)
- `.json` - JSON format
- Keep `.pfsl` - Custom format

### 2. **Delimiter**
Currently: `;` (semicolon)
Options:
- `,` (comma) - Standard CSV
- `\t` (tab) - TSV format
- `|` (pipe) - Pipe-delimited
- Custom delimiter

### 3. **Date Format**
Currently: `DD-MM-YYYY HH:MM:SS`
Options:
- `YYYY-MM-DD HH:MM:SS` - ISO-like format
- `YYYY/MM/DD HH:MM:SS` - Slash separator
- `DD/MM/YYYY HH:MM:SS` - Slash separator
- `MM/DD/YYYY HH:MM:SS` - US format
- Unix timestamp
- ISO 8601: `YYYY-MM-DDTHH:MM:SSZ`

### 4. **Quoting**
Currently: No quotes
Options:
- Quote all values
- Quote only strings
- Quote values containing delimiter
- No quotes (current)

### 5. **Header Row**
Currently: Custom headers from fieldMapping
Options:
- Keep custom headers
- Use database field names
- Add/remove specific headers
- Reorder headers

### 6. **Number Formatting**
Currently: Raw values
Options:
- Fixed decimal places (e.g., 2 decimals for coordinates)
- Scientific notation
- Thousand separators
- Custom formatting per field

### 7. **Encoding**
Currently: UTF-8
Options:
- UTF-8 with BOM
- UTF-16
- ASCII
- Windows-1252

### 8. **Line Endings**
Currently: `\n` (Unix)
Options:
- `\r\n` (Windows)
- `\n` (Unix/Mac)
- `\r` (Old Mac)

---

## Files That Need Modification

### Backend Files
1. **`backend/src/routes/records.js`** (Lines 304-573)
   - Manual export endpoint
   - CSV generation logic
   - Date formatting
   - Filename generation

2. **`backend/src/routes/autoExport.js`** (Lines 198-400)
   - Auto export function
   - CSV generation (same as manual)
   - Date formatting (same as manual)
   - Filename generation

### Frontend Files
1. **`frontend/src/pages/DataSM.js`** (Lines 59-71, 184-226)
   - Field mapping definition
   - Export request parameters
   - File extension setting

---

## Recommended Changes Based on Common Requirements

### Option 1: Standard CSV Format
- **Extension**: `.csv`
- **Delimiter**: `,` (comma)
- **Quotes**: Quote values containing comma or newline
- **Date**: `YYYY-MM-DD HH:MM:SS` (ISO-like)

### Option 2: Excel-Compatible Format
- **Extension**: `.csv`
- **Delimiter**: `,` (comma)
- **Quotes**: Quote all text values
- **Date**: `YYYY-MM-DD HH:MM:SS`
- **Encoding**: UTF-8 with BOM

### Option 3: Keep Current Format (European CSV)
- **Extension**: `.pfsl` or `.csv`
- **Delimiter**: `;` (semicolon) - Keep
- **Quotes**: No quotes - Keep
- **Date**: `DD-MM-YYYY HH:MM:SS` - Keep or change to `YYYY-MM-DD HH:MM:SS`

### Option 4: JSON Format
- **Extension**: `.json`
- **Format**: JSON array of objects
- **Structure**: Each record as JSON object with field names

---

## Questions to Clarify

Before implementing changes, please specify:

1. **What format do you want?**
   - CSV with comma delimiter?
   - Excel format?
   - JSON?
   - Other?

2. **What date format?**
   - Current: `DD-MM-YYYY HH:MM:SS`
   - ISO: `YYYY-MM-DD HH:MM:SS`
   - Other?

3. **What file extension?**
   - Keep `.pfsl`?
   - Change to `.csv`?
   - Other?

4. **Any other specific requirements?**
   - Decimal precision for coordinates?
   - Number formatting?
   - Additional fields?
   - Field order changes?

---

## Next Steps

Once you specify the desired format, I will:
1. Update the export logic in both manual and auto-export
2. Update the frontend to match
3. Ensure consistency across all export functions
4. Test the changes

**Please let me know what format you'd like for the DATA SM export!**







