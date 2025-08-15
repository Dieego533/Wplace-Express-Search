# Wplace Express Search

![Preview](./05bc0bb9-f448-4fb3-a8e7-ac565f8fa230.png)

---

## 📌 Description

**Wplace Express Search** is a userscript for [Wplace.live](https://wplace.live) that lets you quickly search for locations, save them in a history list, and navigate with a single click.  
This project is based on the code from [whtepony/Wplace-Search](https://github.com/whtepony/Wplace-Search), but with major UI and UX improvements.

---

## ✨ Features

- 🔍 **Fast location search** using Nominatim (OpenStreetMap).
- 📝 **Location history** with up to 3 saved entries.
- ❌ **Per-item deletion** of saved locations.
- 📍 **Support for coordinates** in the format `lat,lng[@zoom]`.
- ⚡ **Live search results** with debounce to avoid unnecessary requests.
- 🎯 **Floating side button** to toggle the search panel.
- 🎨 **Optimized interface** that doesn't obstruct the map.

---

## 🛠 Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) in your browser.
2. Create a new script and paste the content from `wplace-express-search.user.js`.
3. Save changes and reload [Wplace.live](https://wplace.live).

---

## 📖 How to use

1. **Open the panel**  
   Click the blue floating 🔍 button on the left side of the screen.

2. **Search for a location**  
   Type a place name or coordinates into the search field.  
   Results will appear live under the text field.

3. **Save to history**  
   Clicking on a result or coordinates will navigate to that position and automatically save it to your history.

4. **Navigate to a saved location**  
   Click any entry in your history to instantly go there.

5. **Delete a location from history**  
   Press the red `X` next to the location you want to remove without affecting the others.

---

## 📷 Example screenshot

![Script in action](./05bc0bb9-f448-4fb3-a8e7-ac565f8fa230.png)

---

[![Visitors](https://visitor-badge.laobi.icu/badge?page_id=wplace-express-search)](https://github.com/yourusername/wplace-express-search)
