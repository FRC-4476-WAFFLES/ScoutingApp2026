import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

const ShimmerText = ({ children, style, duration = 2500 }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
      ])
    );
    shimmerLoop.start();

    return () => shimmerLoop.stop();
  }, [shimmerAnim, duration]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 150],
  });

  return (
    <View>
      {/* Base gold text - always visible */}
      <Text style={style}>{children}</Text>

      {/* Shimmer overlay */}
      <View style={StyleSheet.absoluteFill}>
        <MaskedView
          style={{ flex: 1 }}
          maskElement={
            <Text style={[style, { backgroundColor: 'transparent' }]}>
              {children}
            </Text>
          }
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ translateX }] },
            ]}
          >
            <LinearGradient
              colors={[
                'transparent',
                'rgba(255, 255, 255, 0.4)',
                'rgba(255, 255, 255, 0.8)',
                'rgba(255, 255, 255, 0.4)',
                'transparent',
              ]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1, width: 100 }}
            />
          </Animated.View>
        </MaskedView>
      </View>
    </View>
  );
};

export default ShimmerText;
