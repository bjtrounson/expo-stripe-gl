import { ExpoWebGLRenderingContext } from "expo-gl";
import {
    Material,
    Mesh,
    MiniGl,
    PlaneGeometry,
    Uniform,
    UniformTypes
} from "./minigl";
import {
    BLEND_FILE,
    FRAGMENT_FILE,
    NOISE_FILE,
    VERTEX_FILE
} from "./shaderfile";

export function normalizeColor(
    hexCode: number | string
): [number, number, number] {
    let hex = hexCode;
    if (typeof hex === "string") {
        hex = parseInt(hex.replace("#", ""), 16);
    }

    return [
        ((hex >> 16) & 255) / 255,
        ((hex >> 8) & 255) / 255,
        (255 & hex) / 255
    ];
}

export interface GradientConfig {
    /** The colors on the gradient. Length must stay constant. */
    colors: ([number, number, number] | string | number)[];
    /** Whether a color is active on the gradient. Same length as `colors` */
    activeColors: boolean[];
    /** Whether the gradient is in wireframe mode so outlines are shown
     *  instead of colours. */
    wireframe: boolean;
    /** The vertices-per-pixel along the x and y.
     *
     *  To change after init, call `resize`.
     */
    density: [number, number];
    /** The speed the animation moves at. */
    speed: number;
    /** The angle of the gradient, in radians. */
    angle: number;
    /** The random noise seed. */
    seed: number;
    /** The scale of the X, Y, and Z-axis.
     *
     * The Z-axis is also the the amplitude of the peaks. As scaleX and scaleY
     * increase, this should decrease.
     */
    scale: [number, number, number];
    /** Whether to enable the shadow at the top-right of the screen. */
    darkenTop: boolean;
    /** The amount the shadow affects each color channel. `-1` to disable for a chennel. */
    shadowPower: [number, number, number];
    /** The scaling factor to apply to the noise, as it approaches the edges.
     *
     * `1 - abs(x)^noiseFadeEdges` is applied to the noise value, where `x` is
     *  the distance of the point from the top/bottom edge, in the range [-1, 1].
     *
     *  Set to `0` to disable.
     */
    noiseFadeEdges: number;
    /** The floor of the gradient. Should be in the range `[-1, 1]`.
     *
     * Any values above 0 will cause issues at the bottom of the screen.
     */
    noiseFloor: number;
    /** How much the colours bleed into each other. */
    blendDistance: number;
}

/**
 *  ```
 *  const [gradient, setGradient] = useState<Gradient | null>(null);
 *
 *  <GLView
 *      style={{
 *          position: "absolute",
 *          top: 0,
 *          left: 0,
 *          right: 0,
 *          bottom: 0
 *      }}
 *      onContextCreate={(gl: ExpoWebGLRenderingContext) => {
 *          let g = new Gradient(gl);
 *          gl.clearColor(1, 1, 1, 1);
 *          setGradient(g);
 *      }}
 *  />
 *  ```
 *
 *  Use Gradient.pause() and Gradient.play() for controls.
 *
 *  NOTES:
 *  - You can change the config at any time, just make sure to call
 *    the `instance.updateConfig()` function afterwards.
 *  - The number of colors is constant, but you can change the colors themselves.
 */
export class Gradient {
    minigl: MiniGl;
    uniforms: Record<string, Uniform> = {};
    mesh?: Mesh;
    material?: Material;
    geometry?: PlaneGeometry;
    shaderFiles: {
        vertex: string;
        noise: string;
        blend: string;
        fragment: string;
    };

    time = 0;
    lastFrameTime = 0;

    width?: number;
    height = 600;

    xSegCount?: number;
    ySegCount?: number;

    private _playing: boolean;
    public get playing() {
        return this._playing;
    }

    // The number of colours initially loaded with.
    // This value is not allowed to change.
    readonly colorCount: number;

    conf: GradientConfig;

    constructor(
        gl: ExpoWebGLRenderingContext,
        conf: Partial<GradientConfig> = {}
    ) {
        this.shaderFiles = {
            vertex: VERTEX_FILE,
            noise: NOISE_FILE,
            blend: BLEND_FILE,
            fragment: FRAGMENT_FILE
        };

        this.conf = {
            colors: ["#ef008f", "#6ec3f4", "#7038ff", "#ffba27"],
            activeColors: [true, true, true, true],
            wireframe: false,
            density: [0.06, 0.16],
            speed: 1,
            angle: 0,
            seed: 5,
            darkenTop: true,
            shadowPower: [-1, gl.drawingBufferWidth < 600 ? 5 : 6, -1],
            noiseFadeEdges: 2,
            noiseFloor: 0,
            blendDistance: 4,
            scale: [140, 290, 320],
            ...conf
        };

        this._playing = true;

        this.minigl = new MiniGl(
            gl,
            gl.drawingBufferWidth,
            gl.drawingBufferHeight
        );
        this.colorCount = this.conf.colors.length;

        this.initMesh();
        this.resize();
        requestAnimationFrame(() => this.animate());
    }

    resize() {
        this.width = this.minigl.gl.drawingBufferWidth;
        this.height = this.minigl.gl.drawingBufferHeight;
        this.minigl?.setSize(this.width, this.height);
        this.minigl?.setOrthographicCamera();

        this.xSegCount = Math.ceil(this.width * (this.conf?.density[0] ?? 0));
        this.ySegCount = Math.ceil(this.height * (this.conf?.density[1] ?? 0));

        if (this.mesh) {
            this.mesh.geometry.setTopology(this.xSegCount, this.ySegCount);
            this.mesh.geometry.setSize(this.width, this.height);
        }
    }

    shouldSkipFrame() {
        return this.playing === false;
    }

    animate() {
        const time = Date.now();
        if (!this.shouldSkipFrame()) {
            this.time +=
                Math.min(time - this.lastFrameTime, 1000 / 15) *
                this.conf.speed;
            this.lastFrameTime = time;

            if (this.mesh) {
                this.mesh.material.uniforms.u_time.value = this.time;
            }

            this.minigl.render();
        }

        if (this.playing) {
            requestAnimationFrame(() => this.animate());
        }
    }

    updateConfig() {
        if (!this.mesh) {
            throw new Error("Mesh not initialized");
        }

        // Update all the conf fields
        this.mesh.wireframe = this.conf.wireframe;
        this.modifyUniform("u_shadow_power", this.conf.shadowPower);
        this.modifyUniform("u_darken_top", this.conf.darkenTop ? 1 : 0);
        this.modifyUniform(
            "u_active_colors",
            this.conf.activeColors.map((c) => (c ? 1 : 0))
        );
        this.modifyUniform("u_global.noiseFreq", [
            this.conf.scale[0] / 1e6,
            this.conf.scale[1] / 1e6
        ]);
        this.modifyUniform("u_global.noiseSpeed", 5e-6);
        this.modifyUniform(
            "u_vertDeform.incline",
            Math.sin(this.conf.angle) / Math.cos(this.conf.angle)
        );
        this.modifyUniform("u_vertDeform.offsetTop", -0.5);
        this.modifyUniform("u_vertDeform.offsetBottom", -0.5);
        this.modifyUniform("u_vertDeform.noiseFreq", [3, 4]);
        this.modifyUniform("u_vertDeform.noiseAmp", this.conf.scale[2]);
        this.modifyUniform("u_vertDeform.noiseSpeed", 10);
        this.modifyUniform("u_vertDeform.noiseFlow", 3);
        this.modifyUniform("u_vertDeform.noiseSeed", this.conf.seed);
        this.modifyUniform(
            "u_vertDeform.noiseFadeEdges",
            this.conf.noiseFadeEdges
        );
        this.modifyUniform(
            "u_vertDeform.noiseFloor",
            this.conf.noiseFloor * this.conf.scale[2]
        );
        this.modifyUniform("u_blend_distance", this.conf.blendDistance);

        let colorsAsVec3 = this.colorsAsVec3();
        this.modifyUniform("u_baseColor", colorsAsVec3[0]);

        if (this.conf.colors.length !== this.colorCount) {
            throw new Error(
                "Number of colours can not change. Remount the gradient."
            );
        }

        for (let i = 1; i < this.conf.colors.length; i++) {
            let wavelayerIndex = i - 1;
            this.modifyUniform(
                `u_waveLayers.${wavelayerIndex}.color`,
                colorsAsVec3[i]
            );
            this.modifyUniform(`u_waveLayers.${wavelayerIndex}.noiseFreq`, [
                2 + i / this.conf.colors.length,
                3 + i / this.conf.colors.length
            ]);
            this.modifyUniform(
                `u_waveLayers.${wavelayerIndex}.noiseSpeed`,
                11 + 0.3 * i
            );
            this.modifyUniform(
                `u_waveLayers.${wavelayerIndex}.noiseFlow`,
                6.5 + 0.3 * i
            );
            this.modifyUniform(
                `u_waveLayers.${wavelayerIndex}.noiseSeed`,
                this.conf.seed + 10 * i
            );
            this.modifyUniform(
                `u_waveLayers.${wavelayerIndex}.noiseFloor`,
                0.1
            );
            this.modifyUniform(
                `u_waveLayers.${wavelayerIndex}.noiseCeil`,
                0.63 + 0.07 * i
            );
        }
    }

    /** Modify a uniform. Use dot-syntax to access inner fields/array items.
     *
     *  E.g., `u_speed.someArrayField.0.exampleStructValue`
     */
    modifyUniform(name: string, value: UniformTypes[keyof UniformTypes]) {
        if (!this.mesh) {
            throw new Error("Mesh not initialized");
        }

        let item: Record<string, Uniform> | Uniform =
            this.mesh.material.uniforms;
        if (!item) throw new Error("No uniforms found");

        for (const key of name.split(".")) {
            if (item instanceof Uniform) {
                // @ts-ignore
                // I dont care about type safety here. If you cause problems
                // its your own fault.
                item = item.value[key];
            } else if (typeof item === "object" && key in item) {
                item = item[key];
            } else {
                console.warn(item);
                throw new Error(`Uniform ${name} not found at ${key}`);
            }
        }
        item.value = value;
    }

    colorsAsVec3() {
        return this.conf.colors.map((c) => {
            if (typeof c === "string" || typeof c === "number") {
                return normalizeColor(c);
            } else return c;
        });
    }

    pause() {
        this._playing = false;
    }

    play() {
        requestAnimationFrame(() => this.animate());
        this._playing = true;
    }

    initMaterial() {
        let colorsAsVec3 = this.colorsAsVec3();

        this.uniforms = {
            u_time: new Uniform(this.minigl, {
                value: 0
            }),
            u_shadow_power: new Uniform(this.minigl, {
                type: "vec3",
                value: this.conf.shadowPower
            }),
            u_darken_top: new Uniform(this.minigl, {
                value: this.conf.darkenTop ? 1 : 0
            }),
            u_active_colors: new Uniform(this.minigl, {
                value: this.conf.activeColors.map((c) => (c ? 1 : 0)),
                type: "vec4"
            }),
            u_blend_distance: new Uniform(this.minigl, {
                value: this.conf.blendDistance
            }),
            u_global: new Uniform(this.minigl, {
                value: {
                    noiseFreq: new Uniform(this.minigl, {
                        value: [
                            this.conf.scale[0] / 1e6,
                            this.conf.scale[1] / 1e6
                        ],
                        type: "vec2"
                    }),
                    noiseSpeed: new Uniform(this.minigl, {
                        value: 5e-6
                    })
                },
                type: "struct"
            }),
            u_vertDeform: new Uniform(this.minigl, {
                value: {
                    incline: new Uniform(this.minigl, {
                        value:
                            Math.sin(this.conf.angle) /
                            Math.cos(this.conf.angle)
                    }),
                    offsetTop: new Uniform(this.minigl, {
                        value: -0.5
                    }),
                    offsetBottom: new Uniform(this.minigl, {
                        value: -0.5
                    }),
                    noiseFreq: new Uniform(this.minigl, {
                        value: [3, 4],
                        type: "vec2"
                    }),
                    noiseAmp: new Uniform(this.minigl, {
                        value: this.conf.scale[2]
                    }),
                    noiseSpeed: new Uniform(this.minigl, {
                        value: 10
                    }),
                    noiseFlow: new Uniform(this.minigl, {
                        value: 3
                    }),
                    noiseSeed: new Uniform(this.minigl, {
                        value: this.conf.seed
                    }),
                    noiseFadeEdges: new Uniform(this.minigl, {
                        value: this.conf.noiseFadeEdges
                    }),
                    noiseFloor: new Uniform(this.minigl, {
                        value: this.conf.noiseFloor * this.conf.scale[2]
                    })
                },
                type: "struct",
                excludeFrom: "fragment"
            }),
            u_baseColor: new Uniform(this.minigl, {
                value: colorsAsVec3[0],
                type: "vec3",
                excludeFrom: "fragment"
            }),
            u_waveLayers: new Uniform(this.minigl, {
                value: [],
                excludeFrom: "fragment",
                type: "array"
            })
        };

        for (let e = 1; e < this.conf.colors.length; e += 1) {
            (this.uniforms.u_waveLayers.value as Uniform[]).push(
                new Uniform(this.minigl, {
                    value: {
                        color: new Uniform(this.minigl, {
                            value: colorsAsVec3[e],
                            type: "vec3"
                        }),
                        noiseFreq: new Uniform(this.minigl, {
                            value: [
                                2 + e / this.conf.colors.length,
                                3 + e / this.conf.colors.length
                            ],
                            type: "vec2"
                        }),
                        noiseSpeed: new Uniform(this.minigl, {
                            value: 11 + 0.3 * e
                        }),
                        noiseFlow: new Uniform(this.minigl, {
                            value: 6.5 + 0.3 * e
                        }),
                        noiseSeed: new Uniform(this.minigl, {
                            value: this.conf.seed + 10 * e
                        }),
                        noiseFloor: new Uniform(this.minigl, {
                            value: 0.1
                        }),
                        noiseCeil: new Uniform(this.minigl, {
                            value: 0.63 + 0.07 * e
                        })
                    },
                    type: "struct"
                })
            );
        }

        const vertexShader = [
            this.shaderFiles.noise,
            this.shaderFiles.blend,
            this.shaderFiles.vertex
        ].join("\n\n");

        return new Material(
            this.minigl,
            vertexShader,
            this.shaderFiles.fragment,
            this.uniforms
        );
    }

    initMesh() {
        this.material = this.initMaterial();
        this.geometry = new PlaneGeometry(this.minigl);
        this.mesh = new Mesh(
            this.minigl,
            this.geometry,
            this.material,
            this.conf.wireframe
        );
    }
}
