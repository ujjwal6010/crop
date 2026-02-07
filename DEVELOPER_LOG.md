# CropHealth AI - Developer Log

## Project Overview

**Name:** CropHealth AI (Offline PWA)  
**Goal:** Offline-first crop disease detection using TensorFlow.js for rural farmers  
**Aesthetic:** 'Stillpoint Studio' / Japandi (Warm Beige, Deep Green, Serif Typography)  
**Version:** v27  
**Last Updated:** 2026-02-07

---

## TensorFlow.js Model Integration

**Model Type:** YOLOv8 Classification (TF.js format)  
**Input Shape:** 224×224×3  
**Preprocessing:** Normalize pixels by /255.0  
**Loading:** `tf.loadGraphModel('model/model.json')`

### Class Labels (Index → Disease)
| Index | Disease | Treatment |
|-------|---------|-----------|
| 0 | Bacterial Spot | Copper-based bactericide |
| 1 | Early Blight | Mancozeb/Chlorothalonil fungicide |
| 2 | Healthy | No treatment needed |
| 3 | Late Blight | Metalaxyl/Ridomil fungicide |

---

## File Structure

| File | Purpose |
|------|---------|
| `index.html` | Main HTML structure with semantic sections and Google Fonts imports |
| `style.css` | Complete Stillpoint design system (~600 lines) with animations |
| `app.js` | Core logic: translations, image upload, diagnosis simulation, IntersectionObserver |
| `service-worker.js` | Offline caching with Network-First strategy |
| `manifest.json` | PWA configuration for installability |
| `model/model.json` | TensorFlow.js model for disease detection |

---

## Design System

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Primary Bg | `#F4EDE4` | Hero, Diagnosis, Navbar |
| Secondary Bg | `#F3E9DD` | How it Works section |
| Footer Bg | `#E6DDD0` | Footer grounding |
| Card Bg | `#F9F7F5` | Diagnosis card (alabaster) |
| Upload Zone | `#F0EBE5` | Specimen drop area (stone) |
| Accent | `#264639` | Buttons, links, icons |
| Text Black | `#1C1C1C` | Headings |
| Text Body | `#4A4540` | Body text |
| Border | `#D1C7BD` | All borders (1px solid) |

### Typography

- **Headings:** `'Cormorant Garamond'` (serif, 300 weight)
- **Body:** `'Inter'` (sans-serif, 400 weight)
- **Eyebrow:** Uppercase, 0.75rem, 3px letter-spacing

### Components

| Component | Style |
|-----------|-------|
| Buttons | Sharp corners (0px radius), uppercase, 2px letter-spacing |
| Cards | Flat, bordered, no shadow, 60px padding |
| Grid | 2x2 edge-to-edge with window-pane borders |
| Upload Zone | Corner brackets using ::before/::after pseudo-elements |

### Animations

| Class/Name | Effect |
|------------|--------|
| `.reveal` | Fade-up on scroll (IntersectionObserver, 1.2s cubic-bezier) |
| `@keyframes float` | Arrow breathing animation (2s infinite, -5px translateY) |
| Navbar `::after` | Sliding underline expands 0% → 100% on hover |

---

## Recent Changes

1. **Aesthetic Pivot:** Switched from 'Tech Green' to 'Stillpoint Studio' Japandi luxury aesthetic
2. **Edge-to-Edge Grid:** How it Works section with full-width borders and 100px padding
3. **Specimen Upload:** Scientific instrument styling with corner brackets
4. **Living Animations:** Navbar sliding underline, floating arrow, scroll reveals
5. **Color Banding:** A-B-A rhythm (Light → Dark → Light → Darker footer)
6. **Footer Foundation:** Deeper beige (#E6DDD0) with uppercase typography

---

## Future Instructions

> [!IMPORTANT]
> **For the next AI or developer:**
> - Always maintain the **offline-first logic** in `app.js`
> - Do NOT introduce CDN dependencies that break offline functionality
> - Keep the design **minimal and architectural**
> - Update this log with every significant change
> - Increment cache version in `service-worker.js` after CSS/JS changes
> - Test with `http-server ./ -p 8080` and refresh twice to clear cache

---

## Quick Reference

```css
/* Primary Button */
.primary-btn {
    background: #264639;
    color: #FFFFFF;
    padding: 16px 32px;
    border-radius: 0;
    text-transform: uppercase;
    letter-spacing: 0.1em;
}

/* Reveal Animation */
.reveal {
    opacity: 0;
    transform: translateY(50px);
    transition: all 1.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.reveal.active {
    opacity: 1;
    transform: translateY(0);
}
```

---

*Keep this file updated with every future change.*
