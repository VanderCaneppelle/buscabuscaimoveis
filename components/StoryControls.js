import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, StatusBar, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function StoryControls({
    stories,
    currentIndex,
    currentProgress,
    canDeleteStory,
    onDeletePress
}) {
    return (
        <>
            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
                {stories.map((_, index) => (
                    <View key={index} style={styles.progressBarBackground}>
                        {index === currentIndex && (
                            <Animated.View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        width: `${currentProgress * 100}%`,
                                    },
                                ]}
                            />
                        )}
                    </View>
                ))}
            </View>

            {/* Delete Button */}
            {canDeleteStory && (
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={onDeletePress}
                    activeOpacity={0.8}
                >
                    <Ionicons name="trash-outline" size={24} color="#fff" />
                </TouchableOpacity>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    progressBarContainer: {
        flexDirection: "row",
        position: "absolute",
        top: Platform.OS === 'ios' ? 50 : 20,
        left: 10,
        right: 10,
        zIndex: 1,
    },
    progressBarBackground: {
        flex: 1,
        height: 3,
        backgroundColor: "rgba(255,255,255,0.3)",
        marginHorizontal: 2,
        borderRadius: 2,
    },
    progressBarFill: {
        height: 3,
        backgroundColor: "#ffffff",
        borderRadius: 3,
        // Otimização: remover shadow no Android para evitar overdraw
        ...(Platform.OS === 'ios' ? {
            shadowColor: "#ffffff",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 2,
        } : {
            elevation: 0,
        }),
    },
    deleteButton: {
        position: "absolute",
        top: Platform.OS === 'ios' ? 100 : 80,
        right: 20,
        backgroundColor: "rgba(160, 8, 8, 0.8)",
        borderRadius: 25,
        width: 50,
        height: 50,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 10,
        zIndex: 10000,
    },
});
