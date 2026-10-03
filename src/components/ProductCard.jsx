import { Heart, Plus, Star } from 'lucide-react'
import { useStore } from '../context/useStore'

export default function ProductCard({ product, onAdd, onReview }) {
  const { wishlist, setWishlist } = useStore()
  const saved = wishlist.includes(product.id)
  return <article className="product-card">
    <div className="product-photo-wrap">
      <img src={product.image || 'https://images.unsplash.com/photo-1604719312566-8912e9c8a213?auto=format&fit=crop&w=800&q=85'} alt={product.name} loading="lazy" />
      {product.badge && <span className="product-badge">{product.badge}</span>}
      <button className={`icon-button wish-button ${saved ? 'is-saved' : ''}`} aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'} onClick={() => setWishlist(saved ? wishlist.filter((id) => id !== product.id) : [...wishlist, product.id])}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /></button>
    </div>
    <div className="product-info">
      <div className="product-meta"><span>{product.category}</span><span className="rating"><Star size={13} fill="currentColor" /> {Number(product.rating || 0).toFixed(1)} <button onClick={() => onReview(product)}>({product.reviews || 0})</button></span></div>
      <h3>{product.name}</h3>
      <p className="product-description">{product.description}</p>
      <div className="product-buy"><div><strong>Rs {Number(product.price).toLocaleString()}</strong><small>{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</small></div><button className="add-button" aria-label={`Add ${product.name} to cart`} disabled={!product.stock} onClick={() => onAdd(product)}><Plus size={17} /><span>Add</span></button></div>
    </div>
  </article>
}
