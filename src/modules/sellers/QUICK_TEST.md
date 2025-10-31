# Quick Test Guide for Seller Creation with Files

## Test 1: Create Seller WITHOUT Banks or Files

**Endpoint:** POST /sellers

**Fields:**
```
legalType: LEGAL_ENTITY
prefix: TEST01
name: Test Company
taxId: 999888777
contactPerson: Test Person
email: test@example.com
phone: +995555000000
address: Test Address, Tbilisi
```

**Expected:** Success ✅

---

## Test 2: Create Seller WITH Logo Only

**Endpoint:** POST /sellers

**Fields:**
```
legalType: LEGAL_ENTITY
prefix: TEST02
name: Test Company 2
taxId: 999888776
contactPerson: Test Person
email: test2@example.com
phone: +995555000001
address: Test Address, Tbilisi
logo: [Select a PNG/JPG file]
```

**Expected:** Success ✅
**Response should include:** `"logo": "https://fra1.cdn.digitaloceanspaces.com/..."`

---

## Test 3: Create Seller WITH Logo, Stamp, and Banks

**Endpoint:** POST /sellers

**Fields:**
```
legalType: LEGAL_ENTITY
prefix: TEST03
name: Test Company 3
taxId: 999888775
contactPerson: Test Person
email: test3@example.com
phone: +995555000002
address: Test Address, Tbilisi
logo: [Select a PNG/JPG file]
stamp: [Select a PNG/JPG file]
banks: [{"name":"Bank of Georgia","swift":"BAGAGE22","address":"3 Pushkin Street, Tbilisi","accountNumber":"GE29NB0000000101904917","isDefault":true}]
```

**Expected:** Success ✅
**Response should include:**
- `"logo": "https://..."`
- `"stamp": "https://..."`
- `"banks": [{ ... }]`

---

## Test 4: Create Seller WITH Multiple Banks

**Endpoint:** POST /sellers

**Fields:**
```
legalType: LEGAL_ENTITY
prefix: TEST04
name: Test Company 4
taxId: 999888774
contactPerson: Test Person
email: test4@example.com
phone: +995555000003
address: Test Address, Tbilisi
banks: [{"name":"Bank of Georgia","swift":"BAGAGE22","address":"3 Pushkin Street","accountNumber":"GE29NB0000000101904917","isDefault":true},{"name":"TBC Bank","swift":"TBCBGE22","address":"7 Marjanishvili Street","accountNumber":"GE64TB0000000123456789","isDefault":false}]
```

**Expected:** Success ✅
**Response should include:** 2 banks in the banks array

---

## Test 5: Update Seller - Change Logo Only

**Endpoint:** PATCH /sellers/{id}

**Fields:**
```
logo: [Select a new PNG/JPG file]
```

**Expected:** Success ✅
**Response should include:** Updated logo URL

---

## Test 6: Update Seller - Add Banks

**Endpoint:** PATCH /sellers/{id}

**Fields:**
```
banks: [{"name":"New Bank","swift":"NEWBANK22","address":"New Address","accountNumber":"GE11AA0000000111111111","isDefault":true}]
```

**Expected:** Success ✅
**Response should include:** New bank in banks array

---

## Expected Errors

### Missing Required Fields
```
legalType: LEGAL_ENTITY
prefix: TEST99
```

**Expected:** ❌ Error - Missing required fields (name, taxId, etc.)

### Invalid Bank JSON
```
banks: invalid json
```

**Expected:** ❌ Bank field will be ignored (returns undefined)

### Missing Bank Required Fields
```
banks: [{"name":"Bank Only"}]
```

**Expected:** ❌ Error - "Each bank must have name, swift, address, and accountNumber"

### Duplicate Prefix
```
prefix: TEST01  (already exists)
```

**Expected:** ❌ Error - "Prefix already exists"

### Invalid File Type
```
logo: [Select a .txt file]
```

**Expected:** ❌ Error - "Invalid file type"

---

## Copy-Paste Test Data

### Simple Banks JSON (1 bank):
```
[{"name":"Bank of Georgia","swift":"BAGAGE22","address":"3 Pushkin Street, Tbilisi","accountNumber":"GE29NB0000000101904917","isDefault":true}]
```

### Multiple Banks JSON (2 banks):
```
[{"name":"Bank of Georgia","swift":"BAGAGE22","address":"3 Pushkin Street, Tbilisi","accountNumber":"GE29NB0000000101904917","isDefault":true},{"name":"TBC Bank","swift":"TBCBGE22","address":"7 Marjanishvili Street, Tbilisi","accountNumber":"GE64TB0000000123456789","isDefault":false}]
```

### With Intermediary Bank:
```
[{"name":"Bank of Georgia","swift":"BAGAGE22","address":"3 Pushkin Street, Tbilisi","accountNumber":"GE29NB0000000101904917","intermediaryBankName":"JP Morgan Chase Bank","intermediaryBankSwift":"CHASUS33","isDefault":true}]
```

---

## Verification Steps

After each test:

1. **Check Response Status:** Should be 200 or 201
2. **Check Response Data:**
   - Verify logo/stamp URLs if files were uploaded
   - Verify banks array if banks were added
   - Check that all fields are saved correctly
3. **Verify in Database:** Run `GET /sellers/{id}` to verify data persists
4. **Check Files:** Access the logo/stamp URLs to verify files are accessible

---

## Cleanup

After testing, delete test sellers:
```
DELETE /sellers/{id}
```

Or use:
```
GET /sellers?search=TEST
```
to find all test sellers, then delete them.
