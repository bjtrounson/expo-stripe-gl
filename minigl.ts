import { ExpoWebGLRenderingContext } from "expo-gl";

export class MiniGl {
    gl: ExpoWebGLRenderingContext;
    meshes: Mesh[];
    lastDebugMsg: number = 0;
    debugEnabled: boolean;
    commonUniforms: Record<string, Uniform>;
    width: number = 0;
    height: number = 0;

    constructor(
        gl: ExpoWebGLRenderingContext,
        width: number,
        height: number,
        debug = false
    ) {
        this.gl = gl;
        this.meshes = [];
        this.debugEnabled = debug;

        const identityMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        this.commonUniforms = {
            projectionMatrix: new Uniform(this, {
                type: "mat4",
                value: identityMatrix
            }),
            modelViewMatrix: new Uniform(this, {
                type: "mat4",
                value: identityMatrix
            }),
            resolution: new Uniform(this, {
                type: "vec2",
                value: [1, 1]
            }),
            aspectRatio: new Uniform(this, {
                type: "float",
                value: 1
            })
        };

        if (width && height) {
            this.setSize(width, height);
        }
    }

    debug(title: string, ...args: any[]) {
        if (!this.debugEnabled) return;

        const time = Date.now();
        if (time - this.lastDebugMsg > 1000) {
            console.log("---");
        }
        console.log(
            new Date().toLocaleTimeString() + title.padStart(32, " ") + ": ",
            ...args
        );
        this.lastDebugMsg = time;
    }

    setSize(w = 640, h = 480) {
        this.debug("MiniGl.setSize", {
            width: w,
            height: h
        });
        this.width = w;
        this.height = h;
        this.gl.viewport(0, 0, w, h);
        this.commonUniforms.resolution.value = [w, h];
        this.commonUniforms.aspectRatio.value = w / h;
    }

    //left, right, top, bottom, near, far
    setOrthographicCamera(e = 0, t = 0, n = 0, near = -2e3, far = 2e3) {
        this.commonUniforms.projectionMatrix.value = [
            2 / this.width,
            0,
            0,
            0,
            0,
            2 / this.height,
            0,
            0,
            0,
            0,
            2 / (near - far),
            0,
            e,
            t,
            n,
            1
        ];
        this.debug(
            "setOrthographicCamera",
            this.commonUniforms.projectionMatrix.value
        );
    }

    render() {
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clearDepth(1);
        // this.meshes.forEach((mesh) => mesh.draw());
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.meshes.forEach((mesh) => mesh.draw());
        // this.gl.drawArrays(this.gl.POINTS, 0, 1);
        this.gl.flush();
        this.gl.endFrameEXP();
    }
}

export class Material {
    miniGl: MiniGl;
    program: WebGLProgram;
    uniforms: Record<string, Uniform>;
    uniformInstances: {
        uniform: Uniform;
        location: WebGLUniformLocation | null;
    }[];

    vertexSource: string;
    fragmentSource: string;
    vertexShader: WebGLShader;
    fragmentShader: WebGLShader;

    constructor(
        miniGl: MiniGl,
        vertexShaders: string,
        fragmentShaders: string,
        uniforms: Record<string, Uniform> = {}
    ) {
        this.miniGl = miniGl;
        this.uniforms = uniforms;
        this.uniformInstances = [];

        const prefix = "precision highp float;";
        this.vertexSource = `
            ${prefix}
            attribute vec4 position;
            attribute vec2 uv;
            attribute vec2 uvNorm;
            ${this.getUniformVariableDeclarations(
                this.miniGl.commonUniforms,
                "vertex"
            )}
            ${this.getUniformVariableDeclarations(uniforms, "vertex")}
            ${vertexShaders}
        `;
        this.fragmentSource = `
            ${prefix}
            ${this.getUniformVariableDeclarations(
                this.miniGl.commonUniforms,
                "fragment"
            )}
            ${this.getUniformVariableDeclarations(uniforms, "fragment")}
            ${fragmentShaders}
        `;

        this.vertexShader = this.getShaderByType(
            this.miniGl.gl.VERTEX_SHADER,
            this.vertexSource
        );
        this.fragmentShader = this.getShaderByType(
            this.miniGl.gl.FRAGMENT_SHADER,
            this.fragmentSource
        );

        const program = this.miniGl.gl.createProgram();
        if (!program) {
            throw new Error("Could not create program");
        }
        this.program = program;

        this.miniGl.gl.attachShader(this.program, this.vertexShader);
        this.miniGl.gl.attachShader(this.program, this.fragmentShader);
        this.miniGl.gl.linkProgram(this.program);

        let param = this.miniGl.gl.getProgramParameter(
            this.program,
            this.miniGl.gl.LINK_STATUS
        );
        if (!param) {
            console.error(this.miniGl.gl.getProgramInfoLog(this.program));
        }

        this.miniGl.gl.useProgram(this.program);
        this.attachUniforms(undefined, this.miniGl.commonUniforms);
        this.attachUniforms(undefined, this.uniforms);
    }

    getShaderByType(type: number, source: string) {
        const shader = this.miniGl.gl.createShader(type);
        if (!shader) throw new Error("Could not create shader");

        this.miniGl.gl.shaderSource(shader, source);
        this.miniGl.gl.compileShader(shader);

        let param = this.miniGl.gl.getShaderParameter(
            shader,
            this.miniGl.gl.COMPILE_STATUS
        );
        if (!param) {
            console.error(this.miniGl.gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    getUniformVariableDeclarations(
        uniforms: Record<string, Uniform>,
        type: "fragment" | "vertex"
    ) {
        return Object.entries(uniforms)
            .map(([uniform, value]) => value.getDeclaration(uniform, type))
            .join("\n");
    }

    attachUniforms(name: undefined, uniforms: Record<string, Uniform>): void;
    attachUniforms(name: string, uniforms: Uniform): void;
    attachUniforms(
        name: string | undefined,
        uniforms: Uniform | Record<string, Uniform>
    ): void {
        if (name === undefined) {
            uniforms = uniforms as Record<string, Uniform>;
            Object.entries(uniforms).forEach(([name, uniform]) => {
                this.attachUniforms(name, uniform);
            });
            return;
        }

        uniforms = uniforms as Uniform;
        if ("array" == uniforms.type) {
            if (!uniforms.value) return;

            const value = uniforms.value as Uniform[];
            value.forEach((uniform, i) =>
                this.attachUniforms(`${name}[${i}]`, uniform)
            );
        } else if ("struct" == uniforms.type) {
            if (!uniforms.value) return;

            const value = uniforms.value as Record<string, Uniform>;
            Object.entries(value).forEach(([uniform, i]) =>
                this.attachUniforms(`${name}.${uniform}`, i)
            );
        } else {
            // this.miniGl.debug("Material.attachUniforms", {
            //     name: name,
            //     uniform: uniforms
            // });
            this.uniformInstances.push({
                uniform: uniforms,
                location: this.miniGl.gl.getUniformLocation(this.program, name)
            });
        }
    }
}

export type UniformTypes = {
    float: number;
    int: number;
    vec2: Float32List;
    vec3: Float32List;
    vec4: Float32List;
    mat4: Float32List;
    array: Uniform[];
    struct: Record<string, Uniform>;
};

export interface UniformOptions {
    type?: keyof UniformTypes;
    value: UniformTypes[keyof UniformTypes];
    excludeFrom?: "fragment" | "vertex";
    transpose?: boolean;
}

export class Uniform {
    miniGl: MiniGl;
    type: keyof UniformTypes;
    value: UniformTypes[keyof UniformTypes];
    transpose: boolean = false;
    excludeFrom?: "vertex" | "fragment";

    constructor(miniGl: MiniGl, opt: UniformOptions) {
        this.miniGl = miniGl;

        this.type = opt.type ? opt.type : "float";
        this.value = opt.value;
        this.excludeFrom = opt.excludeFrom;
        this.transpose = opt.transpose ? opt.transpose : false;

        this.update();
    }

    update(location: WebGLUniformLocation | null = null) {
        // this.miniGl.debug("Uniform.update", {
        //     location: location,
        //     type: this.type,
        //     value: this.value
        // });

        if (this.value !== undefined) {
            if (this.type === "float") {
                this.miniGl.gl.uniform1f(
                    location,
                    this.value as UniformTypes["float"]
                );
            } else if (this.type === "int") {
                this.miniGl.gl.uniform1i(
                    location,
                    this.value as UniformTypes["int"]
                );
            } else if (this.type === "vec2") {
                this.miniGl.gl.uniform2fv(
                    location,
                    this.value as UniformTypes["vec2"]
                );
            } else if (this.type === "vec3") {
                this.miniGl.gl.uniform3fv(
                    location,
                    this.value as UniformTypes["vec3"]
                );
            } else if (this.type === "vec4") {
                this.miniGl.gl.uniform4fv(
                    location,
                    this.value as UniformTypes["vec4"]
                );
            } else if (this.type === "mat4") {
                this.miniGl.gl.uniformMatrix4fv(
                    location,
                    this.transpose,
                    this.value as UniformTypes["mat4"]
                );
            }
        }
    }

    getDeclaration(
        name: string,
        type: "vertex" | "fragment",
        length: number = 0
    ): string {
        if (this.excludeFrom !== type) {
            if ("array" === this.type) {
                const v = this.value as UniformTypes["array"];
                let declaration = v[0].getDeclaration(name, type, v.length);
                return (
                    declaration + `\nconst int ${name}_length = ${v.length};`
                );
            }

            if ("struct" === this.type) {
                let name_no_prefix = name.replace("u_", "");
                name_no_prefix =
                    name_no_prefix.charAt(0).toUpperCase() +
                    name_no_prefix.slice(1);
                return (
                    `uniform struct ${name_no_prefix} {\n` +
                    Object.entries(this.value as UniformTypes["struct"])
                        .map(([name, uniform]) =>
                            uniform
                                .getDeclaration(name, type)
                                .replace(/^uniform/, "")
                        )
                        .join("") +
                    `\n} ${name}${length > 0 ? `[${length}]` : ""};`
                );
            }

            return `uniform ${this.type} ${name}${
                length > 0 ? `[${length}]` : ""
            };`;
        }

        return "";
    }
}

type Orientation = "xy" | "xz" | "yx" | "yz" | "zx" | "zy";
export class PlaneGeometry {
    miniGl: MiniGl;
    attributes: Record<string, Attribute>;

    xSegCount: number = 1;
    ySegCount: number = 1;
    vertexCount: number = 0;
    quadCount: number = 0;

    width: number = 1;
    height: number = 1;
    orientation: Orientation = "xz";

    constructor(
        miniGl: MiniGl,
        width?: number,
        height?: number,
        xSegCount?: number,
        ySegCount?: number,
        orientation: Orientation = "xz"
    ) {
        this.miniGl = miniGl;

        this.miniGl.gl.createBuffer();
        this.attributes = {
            position: new Attribute(this.miniGl, {
                target: this.miniGl.gl.ARRAY_BUFFER,
                size: 3
            }),
            uv: new Attribute(this.miniGl, {
                target: this.miniGl.gl.ARRAY_BUFFER,
                size: 2
            }),
            uvNorm: new Attribute(this.miniGl, {
                target: this.miniGl.gl.ARRAY_BUFFER,
                size: 2
            }),
            index: new Attribute(this.miniGl, {
                target: this.miniGl.gl.ELEMENT_ARRAY_BUFFER,
                size: 3,
                type: this.miniGl.gl.UNSIGNED_SHORT
            })
        };
        this.setTopology(xSegCount, ySegCount);
        this.setSize(width, height, orientation);
    }

    setTopology(xSegCount = 1, ySegCount = 1) {
        this.xSegCount = xSegCount;
        this.ySegCount = ySegCount;
        this.vertexCount = (this.xSegCount + 1) * (this.ySegCount + 1);
        this.quadCount = this.xSegCount * this.ySegCount * 2;
        this.attributes.uv.values = new Float32Array(2 * this.vertexCount);
        this.attributes.uvNorm.values = new Float32Array(2 * this.vertexCount);
        this.attributes.index.values = new Uint16Array(3 * this.quadCount);

        for (let ySeg = 0; ySeg <= this.ySegCount; ySeg++) {
            for (let xSeg = 0; xSeg <= this.xSegCount; xSeg++) {
                const index = ySeg * (this.xSegCount + 1) + xSeg;
                this.attributes.uv.values[index * 2] = xSeg / this.xSegCount;
                this.attributes.uv.values[index * 2 + 1] =
                    1 - ySeg / this.ySegCount;
                this.attributes.uvNorm.values[index * 2] =
                    (xSeg / this.xSegCount) * 2 - 1;
                this.attributes.uvNorm.values[index * 2 + 1] =
                    1 - (ySeg / this.ySegCount) * 2;

                if (xSeg !== this.xSegCount && ySeg !== this.ySegCount) {
                    const s = ySeg * this.xSegCount + xSeg;
                    this.attributes.index.values[6 * s] = index;
                    this.attributes.index.values[6 * s + 1] =
                        index + 1 + this.xSegCount;
                    this.attributes.index.values[6 * s + 2] = index + 1;
                    this.attributes.index.values[6 * s + 3] = index + 1;
                    this.attributes.index.values[6 * s + 4] =
                        index + 1 + this.xSegCount;
                    this.attributes.index.values[6 * s + 5] =
                        index + 2 + this.xSegCount;
                }
            }
        }

        this.attributes.uv.update();
        this.attributes.uvNorm.update();
        this.attributes.index.update();
        // this.miniGl.debug("Geometry.setTopology", {
        //     uv: this.attributes.uv,
        //     uvNorm: this.attributes.uvNorm,
        //     index: this.attributes.index
        // });
    }

    setSize(width = 1, height = 1, orientation: Orientation = "xz") {
        this.width = width;
        this.height = height;
        this.orientation = orientation;

        if (
            !(
                this.attributes.position.values &&
                this.attributes.position.values.length === 3 * this.vertexCount
            )
        ) {
            this.attributes.position.values = new Float32Array(
                3 * this.vertexCount
            );
        }

        const o = width / -2;
        const r = height / -2;
        const segmentWidth = width / this.xSegCount;
        const segmentHeight = height / this.ySegCount;

        for (let yIndex = 0; yIndex <= this.ySegCount; yIndex++) {
            const t = r + yIndex * segmentHeight;

            for (let xIndex = 0; xIndex <= this.xSegCount; xIndex++) {
                const r = o + xIndex * segmentWidth;
                const l = yIndex * (this.xSegCount + 1) + xIndex;

                this.attributes.position.values[
                    3 * l + "xyz".indexOf(orientation[0])
                ] = r;
                this.attributes.position.values[
                    3 * l + "xyz".indexOf(orientation[1])
                ] = -t;
            }
        }

        this.attributes.position.update();
        // this.miniGl.debug("Geometry.setSize", {
        //     position: this.attributes.position
        // });
    }
}

export class Mesh {
    miniGl: MiniGl;

    geometry: PlaneGeometry;
    material: Material;
    wireframe: boolean;
    attributeInstances: {
        attribute: Attribute;
        location: number;
    }[];

    constructor(
        miniGl: MiniGl,
        geometry: PlaneGeometry,
        material: Material,
        wireframe = false
    ) {
        this.miniGl = miniGl;

        this.geometry = geometry;
        this.material = material;
        this.wireframe = wireframe;
        this.attributeInstances = [];
        Object.entries(this.geometry.attributes).forEach(([e, attribute]) => {
            this.attributeInstances.push({
                attribute: attribute,
                location: attribute.attach(e, this.material.program)
            });
        });

        this.miniGl.meshes.push(this);
    }

    draw() {
        this.miniGl.gl.useProgram(this.material.program);
        this.material.uniformInstances.forEach(({ uniform, location }) =>
            uniform.update(location)
        );
        this.attributeInstances.forEach(({ attribute, location }) =>
            attribute.use(location)
        );

        if (!this.geometry.attributes.index.values) {
            throw new Error("No index values");
        }

        this.miniGl.gl.drawElements(
            this.wireframe ? this.miniGl.gl.LINES : this.miniGl.gl.TRIANGLES,
            this.geometry.attributes.index.values.length,
            this.miniGl.gl.UNSIGNED_SHORT,
            0
        );
    }

    remove() {
        this.miniGl.meshes = this.miniGl.meshes.filter((mesh) => mesh != this);
    }
}

interface AttributeOptions {
    target: number;
    size: number;
    type?: number;
    normalized?: boolean;
}
export class Attribute {
    miniGl: MiniGl;

    type: number;
    values?: Float32Array | Uint16Array;
    size: number;
    normalized: boolean;
    buffer: WebGLBuffer;
    target: number;

    constructor(miniGl: MiniGl, opt: AttributeOptions) {
        this.miniGl = miniGl;

        this.type = this.miniGl.gl.FLOAT;
        this.normalized = false;

        const buffer = this.miniGl.gl.createBuffer();
        if (!buffer) {
            throw new Error("Failed to create the buffer object");
        }
        this.buffer = buffer;

        this.target = opt.target;
        this.size = opt.size;
        this.type = opt.type || this.type;
        this.normalized = opt.normalized || this.normalized;
        this.update();
    }

    update() {
        if (this.values === undefined) return;

        this.miniGl.gl.bindBuffer(this.target, this.buffer);
        this.miniGl.gl.bufferData(
            this.target,
            this.values,
            this.miniGl.gl.STATIC_DRAW
        );
    }

    attach(name: string, program: WebGLProgram) {
        const attribLocation = this.miniGl.gl.getAttribLocation(program, name);

        if (this.target === this.miniGl.gl.ARRAY_BUFFER) {
            this.miniGl.gl.enableVertexAttribArray(attribLocation);
            this.miniGl.gl.vertexAttribPointer(
                attribLocation,
                this.size,
                this.type,
                this.normalized,
                0,
                0
            );
        }

        return attribLocation;
    }

    use(attribLocation: number) {
        this.miniGl.gl.bindBuffer(this.target, this.buffer);

        if (this.target === this.miniGl.gl.ARRAY_BUFFER) {
            this.miniGl.gl.enableVertexAttribArray(attribLocation);
            this.miniGl.gl.vertexAttribPointer(
                attribLocation,
                this.size,
                this.type,
                this.normalized,
                0,
                0
            );
        }
    }
}
