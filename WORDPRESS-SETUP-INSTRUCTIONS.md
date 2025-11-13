# WordPress Setup Instructions for TrioSphere Data Hub

This guide will walk you through hosting your TrioSphere Data Hub on your department's WordPress site.

## Overview

You'll be doing 3 main steps:
1. Upload the Excel file to WordPress
2. Update the HTML file with the Excel file's URL
3. Create a WordPress page and embed the HTML

---

## Step 1: Upload datasets.xlsx to WordPress Media Library

1. **Log in to WordPress**
   - Go to your WordPress admin dashboard (usually `yoursite.com/wp-admin`)

2. **Go to Media Library**
   - In the left sidebar, click **Media** → **Library**
   - Or click **Media** → **Add New**

3. **Upload datasets.xlsx**
   - Click the **Add New** button (or **Upload files** button)
   - Select your `datasets.xlsx` file from your computer
   - Wait for it to upload completely

4. **Get the File URL**
   - Once uploaded, click on the `datasets.xlsx` file in your Media Library
   - You'll see file details on the right side
   - Look for **"File URL"** or **"Copy URL to clipboard"**
   - Copy this URL - it should look something like:
     ```
     https://yoursite.com/wp-content/uploads/2025/01/datasets.xlsx
     https://onehealth.colostate.edu/wp-content/uploads/sites/4/2025/11/datasets.xlsx
     ```
   - **Save this URL** - you'll need it in the next step!

---

## Step 2: Update the HTML File with Your Excel URL

1. **Open the file** `wordpress-data-hub.html` in a text editor
   - You can use Notepad (Windows), TextEdit (Mac), or any code editor

2. **Find line 23** (near the top of the `<script>` section)
   - Look for this line:
   ```javascript
   const EXCEL_FILE_URL = 'YOUR_MEDIA_LIBRARY_URL_HERE';
   ```

3. **Replace the placeholder** with your actual URL:
   ```javascript
   const EXCEL_FILE_URL = 'https://yoursite.com/wp-content/uploads/2025/01/datasets.xlsx';
   ```
   - Make sure to keep the single quotes `' '` around the URL!

4. **Save the file**

---

## Step 3: Create a WordPress Page

1. **Create a New Page**
   - In WordPress admin, go to **Pages** → **Add New**

2. **Add a Title**
   - Enter a page title like "Data Hub" or "TrioSphere" at the top

3. **Choose Full-Width Template (if available)**
   - Look for a **Template** setting in the right sidebar
   - If you see options like "Default Template", "Full Width", etc., choose **Full Width**
   - If you don't see this option, that's okay - skip this step

---

## Step 4: Add Your Custom HTML

1. **Add a Custom HTML Block**
   - Click the **+** button to add a new block
   - Search for "Custom HTML" or "HTML"
   - Click on **Custom HTML** block

2. **Paste Your Code**
   - Open `wordpress-data-hub.html` in your text editor
   - Select **ALL** the content (Ctrl+A or Cmd+A)
   - Copy it (Ctrl+C or Cmd+C)
   - Paste it into the Custom HTML block in WordPress (Ctrl+V or Cmd+V)

3. **Preview Your Page**
   - Click the **Preview** button at the top right
   - Choose **Preview in new tab**
   - Check if everything looks correct and data is loading

4. **Publish Your Page**
   - If everything looks good, click the **Publish** button
   - Click **Publish** again to confirm

---

## Step 5: Test Everything

1. **Visit Your Published Page**
   - Click "View Page" after publishing

2. **Check That:**
   - The page loads without errors
   - The result counter shows the correct number of datasets (not an error)
   - You can search and filter datasets
   - Clicking "View Details" opens the modal with dataset information
   - The three view modes work (card, list, preview)
   - CSV export works

---

## Troubleshooting

### Problem: "Error loading Excel file"

**Solution 1: Check the URL**
- Make sure you updated `EXCEL_FILE_URL` in the HTML file
- The URL should be the exact URL from WordPress Media Library
- Make sure there are quotes around the URL: `'https://...'`

**Solution 2: Check File Permissions**
- Go back to Media Library
- Click on your `datasets.xlsx` file
- Make sure it's not set to "Private"
- Try opening the File URL in a new browser tab - it should download the file

**Solution 3: WordPress Security Plugin**
- Some WordPress security plugins block `.xlsx` files
- Ask your WordPress administrator if there's a security plugin that might be blocking it

### Problem: Page looks broken or has WordPress theme elements interfering

**Solution: Add Custom CSS**
1. In WordPress, go to **Appearance** → **Customize**
2. Look for **Additional CSS** or **Custom CSS**
3. Add this code:
```css
/* Reset WordPress styles for TrioSphere */
.triosphere-container * {
  all: revert;
}
```
4. Click **Publish**

### Problem: Can't find "Custom HTML" block

**Solution:**
- You might be using the Classic Editor instead of the Block Editor
- Try clicking the three dots menu (⋮) in the top right
- Look for "Switch to Block Editor" or similar option
- If that's not available, you may need to ask your WordPress administrator for help

---

## Updating Data in the Future

Whenever you want to update your datasets:

1. **Edit your `datasets.xlsx` file** on your computer
2. **Go to WordPress Media Library**
3. **Find the existing `datasets.xlsx` file**
4. **Hover over it and click "Replace"** or **delete it and upload the new version**
   - If replacing, keep the same filename
5. **Your page will automatically show the new data** the next time someone visits (or refreshes)

**Note:** If you replaced the file and kept the same filename, you might need to clear your browser cache to see updates immediately.

---

## Tips for Best Results

1. **Use a Full-Width Page Template** - This gives your data hub more space

2. **Remove Extra WordPress Elements:**
   - Some themes let you hide the sidebar, header, or footer for specific pages
   - Look for "Page Settings" or "Template Options" in the right sidebar when editing your page

3. **Performance:**
   - The preview view loads images from PagePeeker, which can be slow on first load
   - Thumbnails are cached after the first load, so subsequent visits will be faster

4. **Mobile Testing:**
   - Always test your page on a mobile device
   - The filters will appear as a slide-out panel on small screens

---

## Need Help?

If you get stuck:

1. **Check the browser console for errors:**
   - Right-click on the page → Inspect → Console tab
   - Look for red error messages
   - Take a screenshot and share it if you need help

2. **Contact your WordPress administrator:**
   - They can check if there are any security settings blocking the Excel file
   - They can help you set up a full-width page template

3. **Test locally first:**
   - You can test everything by opening `wordpress-data-hub.html` directly in your browser
   - Just change `EXCEL_FILE_URL` to `'datasets.xlsx'` and put both files in the same folder
   - Run a local server: `python3 -m http.server 8000`
   - Open `http://localhost:8000/wordpress-data-hub.html`

---

## File Checklist

Make sure you have these files ready:
- ✅ `datasets.xlsx` - Your data file
- ✅ `wordpress-data-hub.html` - The HTML file with your Media Library URL updated
- ✅ This instruction file for reference

---

Good luck! Your TrioSphere Data Hub will be live soon! 🎉
