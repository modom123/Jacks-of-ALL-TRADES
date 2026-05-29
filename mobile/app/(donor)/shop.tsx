import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '../../constants/colors';
import { api, Product } from '../../lib/api';
import { useCart } from '../../hooks/useCart';

export default function ShopScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const { cart, addItem, removeItem, totalCents, itemCount } = useCart();

  useEffect(() => {
    api
      .getProducts()
      .then((res) => setProducts(res.products))
      .catch(() => Alert.alert('Error', 'Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  const handleCheckout = async () => {
    if (!cart.length) return;
    setCheckoutLoading(true);
    try {
      const result = await api.createShopSession({
        items: cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
      });
      await WebBrowser.openBrowserAsync(result.url);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.lions.blue} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Fundraiser Shop</Text>
            <Text style={styles.subtitle}>All purchases support JOAT programs</Text>
          </View>
        }
        renderItem={({ item }) => {
          const inCart = cart.find((c) => c.product.id === item.id);
          return (
            <View style={styles.productCard}>
              <Text style={styles.productEmoji}>{item.image_emoji || '📦'}</Text>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productDesc} numberOfLines={2}>
                  {item.description}
                </Text>
                <Text style={styles.productPrice}>${(item.price_cents / 100).toFixed(2)}</Text>
              </View>
              <View style={styles.quantityControl}>
                {inCart ? (
                  <>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => removeItem(item.id)}
                    >
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyNum}>{inCart.quantity}</Text>
                    <TouchableOpacity
                      style={[styles.qtyBtn, styles.qtyBtnBlue]}
                      onPress={() => addItem(item)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => addItem(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      {itemCount > 0 && (
        <View style={styles.cartBar}>
          <View>
            <Text style={styles.cartCount}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
            <Text style={styles.cartTotal}>${(totalCents / 100).toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.checkoutBtn, checkoutLoading && styles.checkoutDisabled]}
            onPress={handleCheckout}
            disabled={checkoutLoading}
            activeOpacity={0.85}
          >
            <Text style={styles.checkoutBtnText}>
              {checkoutLoading ? 'Opening...' : 'Checkout →'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lions.black },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.lions.black },
  list: { padding: 16 },
  header: { marginBottom: 20 },
  title: { color: Colors.white, fontSize: 26, fontWeight: '900', marginBottom: 4 },
  subtitle: { color: Colors.lions.silver, fontSize: 14 },
  productCard: {
    backgroundColor: Colors.lions.mid,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  productEmoji: { fontSize: 36 },
  productInfo: { flex: 1 },
  productName: { color: Colors.white, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  productDesc: { color: Colors.lions.silver, fontSize: 12, lineHeight: 17, marginBottom: 4 },
  productPrice: { color: Colors.lions.blue, fontWeight: '900', fontSize: 16 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnBlue: { backgroundColor: Colors.lions.blue },
  qtyBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  qtyNum: { color: Colors.white, fontWeight: '700', fontSize: 15, minWidth: 20, textAlign: 'center' },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.lions.blue,
    borderRadius: 10,
  },
  addBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  cartBar: {
    backgroundColor: Colors.lions.dark,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartCount: { color: Colors.lions.silver, fontSize: 12 },
  cartTotal: { color: Colors.white, fontWeight: '900', fontSize: 20 },
  checkoutBtn: {
    backgroundColor: Colors.lions.blue,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  checkoutDisabled: { opacity: 0.6 },
  checkoutBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
});
