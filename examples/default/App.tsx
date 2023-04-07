import {Pressable, StyleSheet, Text, View} from 'react-native';
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
            config={
              {
                // Custom config here!
              }
            }
            getGradient={setGradient}
        />
        <View
            key={statKey}
            style={{
                marginTop: 80,
                paddingHorizontal: 16,
                paddingVertical: 8,
                zIndex: 10,
                alignItems: "center",
                justifyContent: "center",
                alignSelf: "center",
                borderWidth: 1,
                borderColor: "white",
                borderRadius: 8,
                backgroundColor: "rgba(0,0,0,0.5)",
            }}
        >
          <Pressable
              style={styles.pressable}
              onPress={() => {
                setKey(key + 1);
              }}
          >
            <Text>Remount & Reset</Text>
          </Pressable>

          <Pressable
              style={styles.pressable}
              onPress={() => {
                if (!gradient) return;
                gradient.playing ? gradient.pause() : gradient.play();
                updateConfig();
              }}
          >
            <Text>{gradient?.playing ? "Pause" : "Play"}</Text>
          </Pressable>

          <Pressable
              style={styles.pressable}
              onPress={() => {
                if (!gradient) return;
                gradient.conf.wireframe = !gradient.conf.wireframe;
                updateConfig();
              }}
          >
            <Text>Wireframe</Text>
          </Pressable>

          <View style={styles.container}>
            <Pressable
                onPress={() => {
                  if (!gradient) return;
                  gradient.conf.noiseFloor =
                      gradient.conf.noiseFloor + 0.1;
                  updateConfig();
                }}
            >
              <Text>INC</Text>
            </Pressable>
            <Text style={{marginHorizontal: 8}}>
              Floor: {gradient?.conf.noiseFloor.toFixed(1)}
            </Text>
            <Pressable
                onPress={() => {
                  if (!gradient) return;
                  gradient.conf.noiseFloor =
                      gradient.conf.noiseFloor - 0.1;
                  updateConfig();
                }}
            >
              <Text>DEC</Text>
            </Pressable>
          </View>

          <View style={styles.container}>
            <Pressable
                onPress={() => {
                  if (!gradient) return;
                  gradient.conf.blendDistance =
                      gradient.conf.blendDistance + 0.5;
                  updateConfig();
                }}
            >
              <Text>INC</Text>
            </Pressable>
            <Text style={{marginHorizontal: 8}}>
              Bleed: {gradient?.conf.blendDistance}
            </Text>
            <Pressable
                onPress={() => {
                  if (!gradient) return;
                  gradient.conf.blendDistance =
                      gradient.conf.blendDistance - 0.5;
                  updateConfig();
                }}
            >
              <Text>DEC</Text>
            </Pressable>
          </View>

          <View style={styles.container}>
            <Pressable
                onPress={() => {
                  if (!gradient) return;
                  gradient.conf.scale[0] =
                      gradient.conf.scale[0] + 10;
                  gradient.resize();
                  updateConfig();
                }}
            >
              <Text>INC</Text>
            </Pressable>
            <Text style={{marginHorizontal: 8}}>
              X-Scale: {gradient?.conf.scale[0]}
            </Text>
            <Pressable
                onPress={() => {
                  if (!gradient) return;
                  gradient.conf.scale[0] =
                      gradient.conf.scale[0] - 10;
                  gradient.resize();
                  updateConfig();
                }}
            >
              <Text>DEC</Text>
            </Pressable>
          </View>
          <View style={styles.container}>
            <Pressable
                onPress={() => {
                  if (!gradient) return;
                  gradient.conf.scale[1] =
                      gradient.conf.scale[1] + 10;
                  gradient.resize();
                  updateConfig();
                }}
            >
              <Text>INC</Text>
            </Pressable>
            <Text style={{marginHorizontal: 8}}>
              Y-Scale: {gradient?.conf.scale[1]}
            </Text>
            <Pressable
                onPress={() => {
                  if (!gradient) return;
                  gradient.conf.scale[1] =
                      gradient.conf.scale[1] - 10;
                  gradient.resize();
                  updateConfig();
                }}
            >
              <Text>DEC</Text>
            </Pressable>
          </View>
          <View style={styles.container}>
            <Pressable
                onPress={() => {
                  if (!gradient) return;
                  gradient.conf.scale[2] =
                      gradient.conf.scale[2] + 10;
                  updateConfig();
                }}
            >
              <Text>INC</Text>
            </Pressable>
            <Text style={{marginHorizontal: 8}}>
              Z-scale: {gradient?.conf.scale[2]}
            </Text>
            <Pressable
                onPress={() => {
                  if (!gradient) return;
                  gradient.conf.scale[2] =
                      gradient.conf.scale[2] - 10;
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

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "white",
        borderRadius: 8,
        backgroundColor: "rgba(0,0,0,0.5)",
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    pressable: {
        borderWidth: 1,
        borderColor: "white",
        borderRadius: 8,
        backgroundColor: "rgba(0,0,0,0.5)",
        paddingVertical: 4,
        paddingHorizontal: 8,
    }
});
