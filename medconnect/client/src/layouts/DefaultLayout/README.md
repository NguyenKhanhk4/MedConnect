# DefaultLayout Structure

## 📁 File Organization

```
DefaultLayout/
├── DefaultLayout.scss     # Main file - imports all components
├── Variables.scss         # CSS variables and responsive breakpoints
├── Header.scss           # Header component styles
├── Footer.scss           # Footer component styles
├── Sidebar.scss          # Sidebar component styles
├── Main.scss             # Main content area styles
├── Header.jsx            # Header component
├── Footer.jsx            # Footer component
└── README.md             # This file
```

## 🎯 Benefits of This Structure

### **1. Modularity**

- Each component has its own SCSS file
- Easy to locate and modify specific styles
- Better code organization and maintainability

### **2. Performance**

- Only load styles for components that are used
- Smaller bundle sizes
- Better caching strategies

### **3. Team Collaboration**

- Multiple developers can work on different components
- Reduced merge conflicts
- Clear separation of concerns

### **4. Responsive Design**

- All components have comprehensive responsive breakpoints
- Consistent design system across all screen sizes
- Mobile-first approach

## 📱 Responsive Breakpoints

| Breakpoint    | Range           | Description       |
| ------------- | --------------- | ----------------- |
| Mobile Small  | 320px - 480px   | Small phones      |
| Mobile Large  | 481px - 767px   | Large phones      |
| Tablet        | 768px - 980px   | Tablets           |
| Large Tablet  | 981px - 1199px  | Large tablets     |
| Desktop       | 1200px - 1399px | Standard desktops |
| Large Desktop | 1400px+         | Large screens     |

## 🎨 CSS Variables

All components use consistent CSS variables defined in `Variables.scss`:

```scss
:root {
  --color-brand: #45c3d2;
  --color-brand-dark: #1095a8;
  --color-highlight: #ffbf00;
  --color-bg-soft: #f3fffe;
  --color-text: #111;
  --radius-pill: 40px;
  --header-height: 72px;
  --primary-color: #12c2e9;
}
```

## 🔧 Usage

### Import in Components

```jsx
// Header.jsx
import "./Header.scss";

// Footer.jsx
import "./Footer.scss";
```

### Import in Main Layout

```scss
// DefaultLayout.scss
@import "./Variables.scss";
@import "./Header.scss";
@import "./Footer.scss";
@import "./Sidebar.scss";
@import "./Main.scss";
```

## 🚀 Features

### **Header**

- Responsive navigation
- Search functionality
- User authentication states
- Mobile hamburger menu
- Touch-friendly interactions

### **Footer**

- Multi-column layout
- Company information
- Quick links
- Contact details
- Responsive stacking

### **Sidebar**

- Animated slide-in
- Categorized navigation
- User account section
- Logout functionality
- Mobile-optimized

### **Main Content**

- Dynamic padding based on header height
- Print-friendly styles
- Accessibility features

## ♿ Accessibility Features

- **Touch Targets**: Minimum 44px for mobile
- **Reduced Motion**: Respects `prefers-reduced-motion`
- **High Contrast**: Supports `prefers-contrast: high`
- **Focus States**: Clear keyboard navigation
- **Print Styles**: Clean printing layout

## 📱 Mobile Optimizations

- **Progressive Enhancement**: Mobile-first approach
- **Touch Interactions**: Optimized for touch devices
- **Performance**: Efficient CSS with minimal repaints
- **Responsive Images**: Adaptive sizing
- **Viewport Optimization**: Proper meta tags

## 🔄 Maintenance

### Adding New Styles

1. Add styles to appropriate component file
2. Follow existing naming conventions
3. Include responsive breakpoints
4. Test across all devices

### Modifying Variables

1. Update `Variables.scss`
2. Test all components for consistency
3. Document changes in this README

### Adding New Components

1. Create new `.scss` file
2. Import in `DefaultLayout.scss`
3. Follow existing structure
4. Update this README
