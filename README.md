# Expo Stripe-GL Gradient

Expo Stripe GL Gradient is a React Native library that allows you to recreate the Stripe WebGL gradient. You can use this library to implement a dynamic background gradient with various configurable properties like colors, speed and more.

## Installation

To use Expo Stripe GL Gradient, you must first install Expo and then install the library using
<br/>
npm: ```npm install expo-stripe-gl```
<br/>
yarn: ```yarn add expo-stripe-gl```

## Usage
You can use Expo Stripe-GL Gradient in your React Native project by importing `GLGradient` and `Gradient` from `expo-stripe-gl`.

```typescript
import {useState} from "react";
import GLGradient, {Gradient} from "expo-stripe-gl";

export default function App() {
  const [key, setKey] = useState(0);
  const [gradient, setGradient] = useState<Gradient | null>(null);
  const [statKey, setStatKey] = useState(-1);
  const updateConfig = () => {
    setStatKey(statKey - 1);
    if (gradient) {
      gradient.updateConfig();
      gradient.minigl.render();
    }
  };

  return (
      <>
          <GLGradient
              key={key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: -10
              }}
              config={{ 
                  // Custom config here! 
              }}
              getGradient={setGradient}
          />
          // Add your own components here.
      </>
  );
}
``` 

## Config

You can customize the gradient using the `config` prop of `GLGradient`. Here is an type definitions for configuration:

``` typescript
interface GradientConfig {
  colors: ([number, number, number] | string | number)[];
  activeColors: boolean[];
  wireframe: boolean;
  density: [number, number];
  speed: number;
  angle: number;
  seed: number;
  scale: [number, number, number];
  darkenTop: boolean;
  shadowPower: [number, number, number];
  noiseFadeEdges: number;
  noiseFloor: number;
  blendDistance: number;
}
``` 

We hope you found it useful and that it helped you create some stunning gradients. If you have any feedback or suggestions for how we can improve the tool, please let us know. Have a great day!