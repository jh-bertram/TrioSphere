# CSU Header and Footer Extraction Summary

## Files Created

I've extracted and cleaned up the CSU header and footer code from the One Health Institute website. You now have two versions to choose from:

### 1. `csu_header_footer.html`
- **Full version** with all original Elementor classes
- Best if you're working with WordPress/Elementor
- Contains all the original structure and data attributes
- More complex but matches the source exactly

### 2. `csu_header_footer_simple.html` ⭐ **RECOMMENDED**
- **Simplified version** with clean HTML structure
- No Elementor dependencies
- Includes complete CSS styling
- Much easier to integrate and customize
- Better for non-WordPress projects

---

## What's Included

### Header Banner
The header contains:
- **CSU Logo**: Dynamically loaded via official CSU script
- **"Colorado State University"** text/link
- **"Vice President for Research"** text/link
- Responsive logo sizing handled automatically

```html
<header id="csu-header">
    <section id="BrandLogo">
        <h1><a href="https://www.colostate.edu">Colorado State University</a></h1>
        <h2><a href="https://www.research.colostate.edu/">Vice President for Research</a></h2>
        <!-- CSU official logo script -->
    </section>
</header>
```

### Footer
The footer has three main sections:

1. **Social Media Bar** (light green background)
   - Facebook, Twitter, LinkedIn icons with links

2. **OVPR Office Information** (middle section)
   - Link to Research office information

3. **Bottom Footer** (two columns)
   - Left: Links (Apply, Contact, Disclaimer, Equal Opportunity, Privacy) + Copyright
   - Right: CSU signature logo (SVG)

---

## How to Use with Claude Code

### Option A: Start Fresh (Recommended)
Tell Claude Code:

> "I have two HTML files with CSU header and footer code. The file `csu_header_footer_simple.html` contains a simplified version with clean HTML and CSS. Can you:
> 1. Review the structure
> 2. Add the header to the top of my website pages
> 3. Add the footer to the bottom of my website pages
> 4. Customize the social media links to point to [your accounts]
> 5. Keep the CSU branding and logo script intact"

### Option B: Detailed Integration
Share the specific sections Claude Code needs:

**For Header:**
```
Copy the <header> section from csu_header_footer_simple.html
Add it after <body> but before your main content
```

**For Footer:**
```
Copy the <footer> section from csu_header_footer_simple.html
Add it after your main content but before </body>
```

**For Styling:**
```
Copy the <style> section from csu_header_footer_simple.html
Add to your site's CSS file or <head> section
```

---

## Key Customization Points

### Update Social Media Links
In the footer-social section, update:
- Facebook: `href="https://www.facebook.com/YOUR_PAGE"`
- Twitter: `href="https://twitter.com/YOUR_HANDLE"`
- LinkedIn: `href="https://www.linkedin.com/company/YOUR_COMPANY"`

### Update Department Name (Optional)
In the header, change:
```html
<h2>
    <a href="https://www.research.colostate.edu/">
        Vice President for Research  <!-- Change this -->
    </a>
</h2>
```

To your institute/department name and link.

### Update Copyright Year
In the footer:
```html
<p class="footer-copyright">© 2021 Colorado State University</p>
```
Change 2021 to current year or your preferred year.

---

## Important Notes

### ✅ DO Keep:
- The CSU logo script: `<script src="//static.colostate.edu/logo/reslogo/logo.min.js">`
- The "Colorado State University" main link
- The CSU brand colors (CSU Green: #1E4D2B)
- The official CSU footer links and copyright

### 🔧 CAN Customize:
- Department/institute name in header (instead of "Vice President for Research")
- Social media links and icons
- Middle footer section content
- Additional links in footer

### ❌ DON'T Remove:
- CSU branding elements
- Official CSU logo
- Required CSU footer links (Apply, Contact, Disclaimer, Equal Opportunity, Privacy)
- Copyright notice

---

## Technical Details

### CSU Logo Script
The header uses an official CSU script that:
- Loads the CSU logo SVG dynamically
- Handles responsive sizing automatically
- Applies correct CSU branding
- Configuration via `logosettings` JavaScript object

### Colors Used
- **CSU Green**: `#1E4D2B` (primary footer background)
- **Light Green**: `#59B359` (social media section)
- **Dark Green**: `#164030` (bottom footer section)
- **CSU Gold**: `#C8C372` (not used in footer but available for accents)

### Responsive Design
The simplified version includes:
- Mobile-friendly layout
- Grid-based footer that stacks on mobile
- Responsive logo sizing via CSU script
- Media queries for screens under 768px

---

## Next Steps for Claude Code

1. **Review** the simplified HTML file
2. **Integrate** header and footer into your page templates
3. **Customize** social media links and any optional content
4. **Test** responsive behavior on different screen sizes
5. **Verify** the CSU logo loads correctly (requires internet connection)

The simplified version is ready to use and includes all necessary styling!
