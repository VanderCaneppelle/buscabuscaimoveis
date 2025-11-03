import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import FavoriteButton from './FavoriteButton';
import { useBoostsStore } from '../stores/boostsStore';

export default function PropertyCard({ property, navigation, onPress }) {
    const isBoosted = useBoostsStore(state => state.isBoosted);
    const mediaFiles = property?.images || [];
    const imageFiles = mediaFiles.filter(file =>
        !file.includes('.mp4') && !file.includes('.mov') && !file.includes('.avi') &&
        !file.includes('.mkv') && !file.includes('.webm')
    );
    const defaultImage = 'https://via.placeholder.com/300x200?text=Sem+Imagem';
    const displayImage = imageFiles.length > 0 ? imageFiles[0] : defaultImage;
    const boosted = property?.id ? isBoosted(property.id) : false;

    const handlePress = useCallback(() => {
        if (typeof onPress === 'function') {
            onPress();
            return;
        }
        navigation.navigate('PropertyDetails', { property });
    }, [navigation, property, onPress]);

    return (
        <TouchableOpacity
            style={[styles.propertyCard, boosted && styles.boostedCard]}
            onPress={handlePress}
            activeOpacity={0.8}
        >
            {boosted && (
                <View style={styles.boostBadgeTop}>
                    <Ionicons name="star" size={10} color="#fff" />
                    <Text style={styles.boostBadgeText}>Destaque</Text>
                </View>
            )}

            <View style={styles.mediaSection}>
                <Image
                    source={{ uri: displayImage }}
                    style={styles.mediaItem}
                    contentFit="cover"
                    cachePolicy="disk"
                    placeholder={require('../assets/placeholder-image.png')}
                    transition={0}
                    priority="normal"
                />
            </View>

            <View style={styles.saveButton}>
                <FavoriteButton disabled={false} propertyId={property.id} />
            </View>

            <View style={styles.propertyInfo}>
                <Text style={styles.propertyTitle} numberOfLines={2}>
                    {property.title ?? 'Título indisponível'}
                </Text>

                <View style={styles.addressContainer}>
                    <Ionicons name="location-outline" size={14} color="#666" />
                    <Text style={styles.propertyLocation}>
                        {property.neighborhood ?? property.address}, {property.city ?? property.state}
                    </Text>
                </View>

                <View style={styles.featuresContainer}>
                    {property.bedrooms != null && (
                        <View style={styles.feature}>
                            <Ionicons name="bed-outline" size={16} color="#666" />
                            <Text style={styles.featureText}>{property.bedrooms}</Text>
                        </View>
                    )}
                    {property.bathrooms != null && (
                        <View style={styles.feature}>
                            <Ionicons name="water-outline" size={16} color="#666" />
                            <Text style={styles.featureText}>{property.bathrooms}</Text>
                        </View>
                    )}
                    {property.parking_spaces != null && (
                        <View style={styles.feature}>
                            <Ionicons name="car-outline" size={16} color="#666" />
                            <Text style={styles.featureText}>{property.parking_spaces}</Text>
                        </View>
                    )}
                    {property.area != null && (
                        <View style={styles.feature}>
                            <Ionicons name="resize-outline" size={16} color="#666" />
                            <Text style={styles.featureText}>{`${property.area} m²`}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.priceContainer}>
                    {((property.sale_price ?? property.salePrice) && parseFloat(property.sale_price ?? property.salePrice) > 0) ? (
                        <View>
                            <Text style={styles.originalPriceRed}>
                                De: R$ {property.price?.toLocaleString('pt-BR') ?? 'Preço indisponível'}
                            </Text>
                            <Text style={styles.salePriceGreen}>
                                Por: R$ {(property.sale_price ?? property.salePrice)?.toLocaleString('pt-BR')}
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.propertyPrice}>
                            R$ {property.price?.toLocaleString('pt-BR') ?? 'Preço indisponível'}
                        </Text>
                    )}
                </View>

                {(property.property_type || property.transaction_type) && (
                    <Text style={styles.propertyType} numberOfLines={1}>
                        {(property.property_type ?? '').toString().trim()}
                        {(property.property_type && property.transaction_type) ? ' - ' : ''}
                        {property.transaction_type === 'rent' ? 'Aluguel' : property.transaction_type === 'sale' ? 'Venda' : property.transaction_type === 'season' ? 'Temporada' : (property.transaction_type ?? '')}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    propertyCard: {
        backgroundColor: '#fff',
        marginHorizontal: 12,
        marginBottom: 15,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        flexDirection: 'row',
        height: 160,
        borderWidth: 2,
        borderColor: '#e0e0e0',
    },
    boostedCard: {
        borderColor: '#ffcc1e',
        borderWidth: 3,
        shadowColor: '#ffcc1e',
        shadowOpacity: 0.3,
    },
    boostBadgeTop: {
        position: 'absolute',
        top: -12,
        left: 16,
        backgroundColor: '#f39c12',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        zIndex: 10,
    },
    boostBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    mediaSection: {
        position: 'relative',
        width: 150,
        height: '100%',
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#f8f9fa',
    },
    mediaItem: {
        width: '100%',
        height: '100%',
        backgroundColor: '#e9ecef',
    },
    saveButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 10,
    },
    propertyInfo: {
        flex: 1,
        padding: 12,
        backgroundColor: '#fff',
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        justifyContent: 'space-between',
    },
    propertyTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#00335e',
        marginBottom: 6,
        paddingRight: 60,
        lineHeight: 18,
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        paddingRight: 60,
    },
    propertyLocation: {
        fontSize: 12,
        color: '#64748b',
        flex: 1,
        marginLeft: 3,
    },
    featuresContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        gap: 4,
    },
    feature: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
        paddingVertical: 0,
        minWidth: 35,
        justifyContent: 'flex-start',
    },
    featureText: {
        fontSize: 11,
        color: '#666',
        marginLeft: 3,
        fontWeight: '400',
    },
    priceContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    propertyPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#00335e',
    },
    originalPriceRed: {
        fontSize: 14,
        color: '#dc2626',
        textDecorationLine: 'line-through',
        marginBottom: 2,
    },
    salePriceGreen: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#059669',
    },
    propertyType: {
        fontSize: 12,
        color: '#7f8c8d',
        textTransform: 'capitalize',
        marginBottom: 4,
    },
});


