# DESIGN SYSTEM — L'Atelier Lumineux

Ce document sert de source unique de vérité visuelle pour la **Plateforme d'Orchestration d'IA Locale (L'Atelier)**. Il respecte strictement la direction artistique définie dans `DIRECTION-ARTISTIQUE-Plateforme-IA-Locaux.md`.

---

## 1. Principes Fondamentaux

- **Atmosphère** : Nocturne, calme, spacieuse et axée sur la précision. 
- **Concept** : « L'Atelier Lumineux » — la lumière chaude (Champagne) indique la disponibilité ou le repos ; la lumière froide et vibrante (Periwinkle) représente l'intensité de la pensée et de la génération.
- **Esthétique** : Dark Editorial premium (proche de Linear × Arc × Reflect, avec l'utilisation de polices à empattements pour les grands titres).

---

## 2. Palette de Couleurs (Dark Theme)

### 2.1 Surfaces & Bordures
| Nom | Token | Valeur | Usage |
|---|---|---|---|
| Background Base | `--bg-0` | `#0A0B0F` | Fond général de l'application |
| Surface 1 | `--bg-1` | `#13151B` | Cartes, barres latérales, conteneurs |
| Surface 2 | `--bg-2` | `#1B1E27` | Survol (hover), blocs secondaires |
| Surface 3 | `--bg-3` | `#22252E` | Zones de saisie, états actifs |
| Border Subtle | `--line-1` | `#262A35` | Lignes de séparation fines |
| Border Strong | `--line-2` | `#3A4150` | Bordures interactives et focus |

### 2.2 Textes
| Nom | Token | Valeur | Usage |
|---|---|---|---|
| Texte Principal | `--text-1` | `#F2F4F8` | Titres majeurs, corps de texte important |
| Texte Secondaire | `--text-2` | `#A8ADBA` | Descriptions, métadonnées, labels |
| Texte Muté | `--text-3` | `#6B7280` | Placeholders, horodatages, détails secondaires |
| Texte sur Accent | `--text-on-accent` | `#0A0B0F` | Texte superposé aux éléments de couleur accent |

### 2.3 Accents (La Lumière)
| Nom | Token | Valeur | Sémantique |
|---|---|---|---|
| **Champagne** | `--accent-warm` | `#E8C474` | Disponible, repos, signature premium |
| Champagne Hover | `--accent-warm-soft` | `#F1D693` | Survol sur éléments Champagne |
| **Periwinkle** | `--accent-cool` | `#8C9EFF` | Modèle actif, génération, réflexion |
| Sauge | `--accent-success` | `#94C29A` | Validations, succès |
| Ambre | `--accent-warn` | `#E8B45E` | Avertissements de quota, limites |
| Orage | `--accent-danger` | `#F08080` | Erreurs, actions destructrices |

---

## 3. Typographie

- **Display & En-têtes (H1, H2)** : **Newsreader** (Google Fonts)
  - Style : Serif contemporain, intellectuel, premium.
- **UI & Corps de texte** : **Inter** (Google Fonts)
  - Style : Sans-serif moderne, optimisé pour la lisibilité et l'interface utilisateur.
- **Code & Données techniques** : **JetBrains Mono** (Google Fonts)
  - Style : Monospace technique, précis.

### Hiérarchie Typographique
- **H1 (Page)** : `Newsreader`, 40px, line-height: 1.1, letter-spacing: -0.02em
- **H2 (Section)** : `Newsreader`, 28px, line-height: 1.2, letter-spacing: -0.015em
- **H3 (Composant)** : `Inter`, 20px, semi-bold (600), line-height: 1.3, letter-spacing: -0.01em
- **Body** : `Inter`, 15px, regular (400), line-height: 1.55
- **Label / Caption** : `Inter`, 13px/12px, medium (500), line-height: 1.4
- **Monospace** : `JetBrains Mono`, 13.5px, line-height: 1.6

---

## 4. Spécifications du Moteur de Motion (Animations)

- **Vitesse dominante** : Moyenne, posée (`--duration-m: 400ms`).
- **Courbe d'Accélération (Sortie)** : `cubic-bezier(0.16, 1, 0.3, 1)` (`--ease-out-expo`) - sorties douces.
- **Courbe de Décélération (Entrée)** : `cubic-bezier(0.4, 0, 0.2, 1)` (`--ease-in-out-smooth`).

### Constantes de Motion (CSS)
```css
--duration-xs: 150ms;   /* micro-interactions */
--duration-s: 220ms;    /* hovers, focus rings */
--duration-m: 400ms;    /* transitions de composants */
--duration-l: 600ms;    /* transitions d'écrans */
--duration-xl: 1000ms;  /* apparition progressive (reveal) */

--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out-smooth: cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 5. Composants Clés (Phase 1)

1. **TopBar (Statut Local)**
   - Badge discret à gauche : "Local · Vos données restent ici" avec un point de pulsation periwinkle en cas de calcul.
2. **ModelSwitch (Sélecteur de Modèles)**
   - Un sélecteur stylisé qui passe de l'argent au champagne avec rotation fluide à l'activation.
3. **MessageBubble (Bulle de Discussion Flat)**
   - Pas de conteneur en forme de bulle ; alignement de type "flat text".
   - Bordure latérale gauche fine (4px) pour démarquer les rôles : `--accent-warm` (utilisateur) et `--accent-cool` (assistant).
4. **ChatStream (Streaming Signature)**
   - Le curseur (caret) s'affiche immédiatement. Les tokens apparaissent avec un stagger de 8ms en fondu + translation vers le haut de 2px.
