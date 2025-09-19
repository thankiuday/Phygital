# QR Positioning Overlay Component

## Overview
The `QRPositioningOverlay` component provides an interactive interface for positioning and resizing QR codes on design images. Users can drag to move the QR code and use resize handles to adjust its size.

## Features

### 🎯 Interactive Positioning
- **Drag to Move**: Click and drag the QR code overlay to position it anywhere on the image
- **Boundary Constraints**: Automatically constrains positioning within image bounds
- **Visual Feedback**: Hover effects and smooth transitions

### 📏 Resize Functionality
- **8 Resize Handles**: Corner and edge handles for precise resizing
- **Proportional Resizing**: Maintains aspect ratio when using corner handles
- **Minimum Size**: Prevents QR code from becoming too small (20px minimum)
- **Boundary Constraints**: Ensures QR code stays within image bounds

### 🎨 Visual Design
- **Clear Overlay**: Semi-transparent blue overlay with border
- **Resize Handles**: Small blue squares with hover effects
- **Move Icon**: Visual indicator for draggable area
- **Position Display**: Real-time position and size information

## Usage

```jsx
import QRPositioningOverlay from '../../components/QRPositioning/QRPositioningOverlay'

const MyComponent = () => {
  const [qrPosition, setQrPosition] = useState({
    x: 10,
    y: 10,
    width: 100,
    height: 100
  })

  const handlePositionChange = (newPosition) => {
    setQrPosition(prev => ({ ...prev, ...newPosition }))
  }

  const handleSizeChange = (newSize) => {
    setQrPosition(prev => ({ ...prev, ...newSize }))
  }

  return (
    <QRPositioningOverlay
      imageUrl="path/to/design.jpg"
      qrPosition={qrPosition}
      onPositionChange={handlePositionChange}
      onSizeChange={handleSizeChange}
      imageWidth={400}
      imageHeight={300}
    />
  )
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `imageUrl` | string | ✅ | URL of the design image |
| `qrPosition` | object | ✅ | Current QR position `{x, y, width, height}` |
| `onPositionChange` | function | ✅ | Callback for position changes |
| `onSizeChange` | function | ✅ | Callback for size changes |
| `imageWidth` | number | ❌ | Display width of image (default: 400) |
| `imageHeight` | number | ❌ | Display height of image (default: 300) |

## Resize Handles

The component provides 8 resize handles:

### Corner Handles
- **NW** (Northwest): Resize from top-left corner
- **NE** (Northeast): Resize from top-right corner  
- **SW** (Southwest): Resize from bottom-left corner
- **SE** (Southeast): Resize from bottom-right corner

### Edge Handles
- **N** (North): Resize height from top edge
- **S** (South): Resize height from bottom edge
- **E** (East): Resize width from right edge
- **W** (West): Resize width from left edge

## Styling

The component uses CSS classes for styling:
- `.qr-overlay`: Main overlay styling with hover effects
- `.qr-resize-handle`: Resize handle styling with transitions

## Integration

This component is integrated into the Upload page (`UploadPage.jsx`) and replaces the previous manual input controls with an interactive interface. Users can now:

1. **Drag** the QR code overlay to move it
2. **Use resize handles** to adjust size
3. **Still use manual inputs** for precise control
4. **Reset** to default position with the reset button

## Backend Integration

The component works seamlessly with the existing backend API:
- Sends integer coordinates (rounded from user interactions)
- Uses the same `/api/upload/qr-position` endpoint
- Maintains compatibility with existing validation

