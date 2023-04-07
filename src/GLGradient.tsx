import {Gradient, GradientConfig} from "./gradient";
import {useState} from "react";
import {ExpoWebGLRenderingContext, GLView, GLViewProps} from "expo-gl";

type GLGradientProps = {
    config?: Partial<GradientConfig>;
    getGradient?: (gradient: Gradient) => void;
} & Omit<Partial<GLViewProps>, "onContextCreate" | "children">

export default function GLGradient({ config, getGradient, ...props }: GLGradientProps) {
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
