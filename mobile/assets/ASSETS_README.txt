KorrectNG Mobile App Assets
============================

Required images for the app. All images should use the brand green (#008751) as the primary color.

1. icon.png
   - Size: 1024x1024 pixels
   - Format: PNG (no transparency for iOS)
   - Content: KorrectNG logo/icon
   - Used for: App icon on home screen

2. adaptive-icon.png
   - Size: 1024x1024 pixels
   - Format: PNG with transparency
   - Content: KorrectNG logo centered (safe area: inner 66%)
   - Used for: Android adaptive icon foreground

3. splash.png
   - Size: 1284x2778 pixels (iPhone 13 Pro Max)
   - Format: PNG
   - Content: KorrectNG logo centered on green background
   - Background color is set to #008751 in app.json
   - Used for: Loading screen when app starts

4. favicon.png
   - Size: 48x48 pixels
   - Format: PNG
   - Content: KorrectNG mini icon
   - Used for: Web browser tab icon

Design Guidelines:
- Primary Green: #008751
- Dark Green: #006B40
- Orange accent: #FF6B35
- Use simple, recognizable icon (e.g., checkmark + wrench combo)
- Keep important content in center for adaptive icons (Android cuts edges)

Tools to create:
- Figma (free): figma.com
- Canva (free): canva.com
- Icon generators: appicon.co, makeappicon.com

After creating images, place them in this folder:
mobile/assets/
├── icon.png
├── adaptive-icon.png
├── splash.png
└── favicon.png
