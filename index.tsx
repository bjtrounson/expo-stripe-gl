import { ExpoWebGLRenderingContext, GLView, GLViewProps } from "expo-gl";
import { useState } from "react";
import { Gradient, GradientConfig } from "./gradient";

export { Gradient, GradientConfig } from "./gradient";
export {
    MiniGl,
    Material,
    UniformTypes,
    UniformOptions,
    Uniform,
    Orientation,
    PlaneGeometry,
    Mesh,
    AttributeOptions,
    Attribute
} from "./minigl";

export interface GLGradientProps
    extends Omit<Partial<GLViewProps>, "onContextCreate" | "children"> {
    config?: Partial<GradientConfig>;
    getGradient?: (gradient: Gradient) => void;
}
export default function GLGradient({
    config,
    getGradient,
    ...props
}: GLGradientProps) {
    const [gradient, setGradient] = useState<Gradient | null>(null);

    return (
        <GLView
            {...props}
            onContextCreate={(gl: ExpoWebGLRenderingContext) => {
                let g = new Gradient(gl, config);
                gl.clearColor(1, 1, 1, 1);
                setGradient(g);
                getGradient?.(g);
            }}
        />
    );
}
