import { useState } from "react";
import { Pressable, View, Text } from "react-native";
import GLGradient, { Gradient } from "./index";

export default function App() {
    const [key, setKey] = useState(0);
    const [gradient, setGradient] = useState<Gradient | null>(null);
    const [statKey, setStatKey] = useState(-1);
    const updateConfig = () => {
        setStatKey(statKey - 1);
        if (gradient) gradient.updateConfig();
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
                config={
                    {
                        // Custom config here!
                    }
                }
                getGradient={setGradient}
            />
            <View
                key={statKey}
                className="bg-white/30 mt-20 rounded-lg self-center items-center justify-center px-4 py-2 z-10"
            >
                <Pressable
                    className="active:bg-white/30 rounded-lg px-2 py-1"
                    onPress={() => {
                        setKey(key + 1);
                    }}
                >
                    <Text>Remount & Reset</Text>
                </Pressable>

                <Pressable
                    className="active:bg-white/30 rounded-lg px-2 py-1"
                    onPress={() => {
                        if (!gradient) return;
                        gradient.playing ? gradient.pause() : gradient.play();
                        updateConfig();
                    }}
                >
                    <Text>{gradient?.playing ? "Pause" : "Play"}</Text>
                </Pressable>

                <Pressable
                    className="active:bg-white/30 rounded-lg px-2 py-1"
                    onPress={() => {
                        if (!gradient) return;
                        gradient.conf.wireframe = !gradient.conf.wireframe;
                        updateConfig();
                    }}
                >
                    <Text>Wireframe</Text>
                </Pressable>

                <View className="flex-row items-center active:bg-white/30 rounded-lg px-2 py-1">
                    <Pressable
                        onPress={() => {
                            if (!gradient) return;
                            gradient.conf.amp = gradient.conf.amp + 10;
                            updateConfig();
                        }}
                    >
                        <Text>INC</Text>
                    </Pressable>
                    <Text className="mx-2">Amp: {gradient?.conf.amp}</Text>
                    <Pressable
                        onPress={() => {
                            if (!gradient) return;
                            gradient.conf.amp = gradient.conf.amp - 10;
                            updateConfig();
                        }}
                    >
                        <Text>DEC</Text>
                    </Pressable>
                </View>
            </View>
        </>
    );
}
