# GitHub Pages Setup Guide

Your TrioSphere site is ready to deploy! Follow these simple steps to get it live.

---

## Quick Facts

- **Your site will be at:** `https://jh-bertram.github.io/TrioSphere`
- **Setup time:** 2-3 minutes
- **Cost:** Completely FREE
- **Updates:** Every time you push to GitHub, the site auto-updates
- **No server needed:** GitHub hosts everything

---

## Step-by-Step Setup

### Step 1: Enable GitHub Pages

1. **Go to your GitHub repository**
   - Open: https://github.com/jh-bertram/TrioSphere

2. **Click on "Settings"**
   - It's in the top menu bar of your repository (far right)

3. **Find "Pages" in the left sidebar**
   - Scroll down the left sidebar
   - Click on **"Pages"** (under "Code and automation" section)

4. **Configure the source**
   - Under "Build and deployment"
   - **Source:** Select "Deploy from a branch"
   - **Branch:** Select `claude/explore-repository-011CUaAxJ9XziRMAbFuxXucf`
   - **Folder:** Select `/ (root)`
   - Click **Save**

5. **Wait for deployment**
   - GitHub will show a message: "Your site is ready to be published"
   - Refresh the page after 1-2 minutes
   - You'll see: "Your site is live at https://jh-bertram.github.io/TrioSphere"

### Step 2: Visit Your Live Site!

Open: **https://jh-bertram.github.io/TrioSphere**

Your TrioSphere Data Hub is now live! 🎉

---

## Important Notes

### Current Landing Page

Right now, `index.html` is your **Data page** (the main dataset browser).

This means when people visit `https://jh-bertram.github.io/TrioSphere`, they'll land directly on the data browser.

**If you want the home page to be the landing page instead:**

See "Optional: Change Landing Page" section below.

---

## Testing Your Site

After deployment, test these features:

- ✅ Data loads correctly (you should see dataset cards)
- ✅ Search works
- ✅ Filters work (Animals/People/Ecosystems pills, sidebar filters)
- ✅ View modes work (Card/List/Preview toggle)
- ✅ CSV export downloads a file
- ✅ "View Details" opens dataset modal
- ✅ Navigation links work (Home, Data, About)
- ✅ Mobile responsive (try on your phone)

---

## Updating Your Site

Whenever you make changes to your local files:

```bash
git add .
git commit -m "Description of changes"
git push
```

**Your live site will automatically update within 1-2 minutes!**

---

## Optional: Change Landing Page

If you want visitors to land on `home.html` (the welcome page) instead of the data page:

### Option A: Swap the Files (Recommended)

```bash
# Rename current index.html to data.html
mv index.html data.html

# Rename home.html to index.html
mv home.html index.html

# Update navigation links in all HTML files
# Change "index.html" to "data.html" in navigation
# Change "home.html" to "index.html" in navigation
```

**I can do this for you if you'd like!** Just let me know.

### Option B: Keep As-Is

If you prefer people to land directly on the data browser, no changes needed!

---

## Custom Domain (Optional)

Want to use your own domain like `data.colostate.edu`?

1. **In GitHub Pages settings**, scroll down to "Custom domain"
2. Enter your domain name
3. Follow the DNS configuration instructions
4. **Ask your IT department** to point the domain to GitHub Pages

**Note:** You'll need help from CSU IT department to configure DNS records.

---

## Troubleshooting

### Problem: 404 Page Not Found

**Solution:**
- Make sure you selected the correct branch: `claude/explore-repository-011CUaAxJ9XziRMAbFuxXucf`
- Make sure you selected `/ (root)` as the folder
- Wait 2-3 minutes for deployment to complete
- Clear your browser cache and try again

### Problem: Data not loading / "Unable to load datasets.xlsx"

**Solution 1:** Check the file path
- Your `datasets.xlsx` is in the root folder - this is correct!
- The JavaScript in `script.js` loads it with `fetch('datasets.xlsx')`
- This should work automatically

**Solution 2:** Clear cache
- Do a hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

**Solution 3:** Check browser console
- Right-click → Inspect → Console tab
- Look for error messages
- If you see CORS errors, that's normal for GitHub Pages and should resolve after deployment

### Problem: Styles look broken

**Solution:**
- Your `style.css` is in the root folder - correct!
- Make sure all HTML files have: `<link rel="stylesheet" href="style.css">`
- Do a hard refresh to clear cached styles

### Problem: Site shows old content after pushing updates

**Solution:**
- GitHub Pages can take 1-5 minutes to rebuild
- Do a hard refresh: Ctrl+Shift+R or Cmd+Shift+R
- Clear your browser cache

---

## File Structure (Current)

Your repository is already perfectly organized for GitHub Pages:

```
TrioSphere/
├── index.html              ← Data browser (current landing page)
├── home.html               ← Welcome page
├── about.html              ← About page
├── style.css               ← All styles
├── script.js               ← All JavaScript
├── datasets.xlsx           ← Your data
├── images/                 ← Image assets
├── wordpress-data-hub.html ← WordPress version (not used for GitHub Pages)
└── README.md
```

Everything is ready to go! No changes needed.

---

## Advantages of GitHub Pages

✅ **Free hosting** - No cost, ever
✅ **Automatic HTTPS** - Secure by default
✅ **Fast CDN** - Global content delivery
✅ **Auto-deploy** - Push to GitHub = live site updates
✅ **Version control** - Easy to roll back changes
✅ **No server maintenance** - GitHub handles everything
✅ **Great for institutions** - Many universities use this

---

## WordPress Comparison

For reference, here's what you'd need for WordPress.com:

| Feature | WordPress.com FREE | WordPress.com Business | GitHub Pages |
|---------|-------------------|----------------------|--------------|
| Custom HTML/JS | ❌ No | ✅ Yes | ✅ Yes |
| Cost | Free | $25/month | Free |
| Your code | ❌ Won't work | ✅ Works | ✅ Works |
| Custom domain | Limited | ✅ Yes | ✅ Yes |
| Maintenance | None | Some | None |

**Self-hosted WordPress** (wordpress.org) allows custom HTML, but requires:
- Web hosting ($5-20/month)
- Domain name ($10-15/year)
- Server maintenance
- Security updates

---

## Next Steps

1. ✅ **Enable GitHub Pages** (follow Step 1 above)
2. ✅ **Test your site** at https://jh-bertram.github.io/TrioSphere
3. ✅ **Share the link** with your colleagues!
4. (Optional) Set up custom domain through CSU IT

---

## Questions?

- **Site not loading?** Wait 2-3 minutes after enabling GitHub Pages
- **Want to change landing page?** Let me know and I'll swap the files for you
- **Need a custom domain?** Contact CSU IT department with your GitHub Pages URL
- **Want to add more features?** Just ask! We can push updates anytime

---

🎉 **You're all set!** Your TrioSphere Data Hub will be live in just a few minutes!
