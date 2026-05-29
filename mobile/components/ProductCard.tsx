import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { Product } from '../lib/api';

interface ProductCardProps {
  product: Product;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}

export default function ProductCard({ product, quantity, onAdd, onRemove }: ProductCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>{product.image_emoji || '📦'}</Text>
      <View style={styles.info}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>${(product.price_cents / 100).toFixed(2)}</Text>
      </View>
      <View style={styles.controls}>
        {quantity > 0 ? (
          <>
            <TouchableOpacity style={styles.qtyBtn} onPress={onRemove} activeOpacity={0.8}>
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qty}>{quantity}</Text>
            <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnBlue]} onPress={onAdd} activeOpacity={0.8}>
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={onAdd} activeOpacity={0.85}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lions.mid,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  emoji: { fontSize: 34 },
  info: { flex: 1 },
  name: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  price: { color: Colors.lions.blue, fontWeight: '900', fontSize: 15, marginTop: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnBlue: { backgroundColor: Colors.lions.blue },
  qtyBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  qty: { color: Colors.white, fontWeight: '700', fontSize: 14, minWidth: 18, textAlign: 'center' },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: Colors.lions.blue,
    borderRadius: 8,
  },
  addBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
});
