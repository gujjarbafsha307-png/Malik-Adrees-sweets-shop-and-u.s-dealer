import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowDownRight, ArrowRight, Check, Clock3, Heart, Languages, MapPin, Menu, Minus, PackageCheck, Plus, Search, ShoppingBag, Star, Store, Truck, X } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { categories } from '../data/products'
import { useStore } from '../context/useStore'
import { money, dateTime } from '../lib/format'

const COPYRIGHT_YEAR = new Date().getFullYear()

export default function Storefront() {
  const { products, offers, cart, setCart, customer, language, setLanguage, placeOrder, orders, wishlist, supabaseEnabled, saveRating, submitComplaint } = useStore()
  const [category, setCategory] = useState('All items')
  const [query, setQuery] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [checkout, setCheckout] = useState(false)
  const [location, setLocation] = useState('')
  const [locating, setLocating] = useState(false)
  const [success, setSuccess] = useState(false)
  const [reviewProduct, setReviewProduct] = useState(null)
  const [reviewStars, setReviewStars] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [complaintText, setComplaintText] = useState('')
  const [complaintNotice, setComplaintNotice] = useState('')
  const whatsappNumber = import.meta.env.VITE_STORE_WHATSAPP_NUMBER
  const navigate = useNavigate()
  const ur = language === 'ur'
  const filtered = useMemo(() => products.filter((product) => (category === 'All items' || product.category === category) && `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(query.toLowerCase())), [products, category, query])
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const categoryUrdu = { 'All items': 'تمام اشیاء', Biscuits: 'بسکٹ', Toffees: 'ٹافیاں', Snacks: 'اسنیکس', Chips: 'چپس', 'Cold Drinks': 'ٹھنڈے مشروبات', Chocolates: 'چاکلیٹ', Grocery: 'گروسری', 'General Store': 'جنرل اسٹور' }
  function addToCart(product) { setCart((items) => { const found = items.find((item) => item.id === product.id); return found ? items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...items, { ...product, quantity: 1 }] }); setCartOpen(true) }
  function updateQuantity(id, amount) { setCart((items) => items.map((item) => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + amount) } : item)) }
  function captureLocation() { if (!navigator.geolocation) { setLocation('Location sharing is unavailable on this device.'); return } setLocating(true); navigator.geolocation.getCurrentPosition(({ coords }) => { setLocation(`${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`); setLocating(false) }, () => { setLocation('Location permission was not granted.'); setLocating(false) }, { enableHighAccuracy: true, timeout: 10000 }) }
  async function submitOrder(event) { event.preventDefault(); try { await placeOrder({ items: cart, deliveryLocation: location }); setCheckout(false); setSuccess(true) } catch (error) { window.alert(error.message || 'Order could not be placed. Please try again.') } }
  async function submitReview(event) { event.preventDefault(); await saveRating(reviewProduct.id, reviewStars, reviewText); setReviewProduct(null); setReviewText('') }
  async function sendComplaint(event) { event.preventDefault(); try { await submitComplaint(complaintText.trim()); setComplaintText(''); setComplaintNotice('Your message has been sent to the store owner. Thank you.'); } catch (error) { setComplaintNotice(error.message || 'Could not send your message.') } }

  return <div className="store-shell">
    <header className="site-header">
      <Link to="/" className="brand-lockup"><span className="brand-mark">M<span>+</span></span><span className="brand-copy"><strong>MALIK ADREES</strong><small>SHOP & SUPPLY</small></span></Link>
      <nav className={`main-nav ${mobileNav ? 'main-nav--open' : ''}`}>
        <a href="#catalog" onClick={() => setMobileNav(false)}>{ur ? 'مصنوعات' : 'Shop'}</a><a href="#offers" onClick={() => setMobileNav(false)}>{ur ? 'آفرز' : 'Offers'}</a><a href="#about" onClick={() => setMobileNav(false)}>{ur ? 'ہمارے بارے میں' : 'About'}</a>
      </nav>
      <div className="header-actions">
        <button className="language-switch" onClick={() => setLanguage(ur ? 'en' : 'ur')} aria-label="Switch language"><Languages size={16} />{ur ? 'English' : 'اردو'}</button>
        <Link to="/account" className="header-account"><Store size={17} /><span>{customer?.shop_name || (ur ? 'میرا اکاؤنٹ' : 'My shop')}</span></Link>
        <button className="cart-trigger" aria-label="Open shopping bag" onClick={() => setCartOpen(true)}><ShoppingBag size={18} /><span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span></button>
        <button className="icon-button mobile-menu" aria-label="Toggle menu" onClick={() => setMobileNav(!mobileNav)}><Menu size={20} /></button>
      </div>
    </header>

    <main>
      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> {ur ? 'ساموندری کی دکانوں کے لیے' : 'A neighbourhood trade partner'}</div>
          <h1 dir={ur ? 'rtl' : undefined}>{ur ? 'آپ کی دکان، ہمیشہ تیار۔' : <>Good shelves.<br /><em>Better business.</em></>}</h1>
          <p>{ur ? 'بسکٹ، اسنیکس، مشروبات اور روزمرہ گروسری، آپ کی دکان تک۔' : 'Biscuits, snacks, drinks and everyday shop essentials, supplied across Samundri.'}</p>
          <div className="hero-actions"><a className="button button--dark" href="#catalog">{ur ? 'مصنوعات دیکھیں' : 'Explore products'} <ArrowDownRight size={17} /></a><span className="delivery-note"><Truck size={16} />{ur ? 'ساموندری ڈیلیوری دستیاب ہے' : 'Samundri delivery available'}</span></div>
          <div className="hero-proof"><div className="proof-avatars"><span>MA</span><span>SS</span><span>+</span></div><p><strong>Local shops, stocked.</strong><br />Reliable everyday supply in Samundri.</p></div>
        </div>
        <div className="hero-image" role="img" aria-label="A well-stocked neighbourhood general store"><div className="hero-image-shade" /><div className="hero-photo-caption"><MapPin size={14} /><span>CHAK BAZAR · SAMUNDRI</span></div><div className="hero-stamp"><span>LOCAL</span><strong>01</strong><span>DELIVERY</span></div></div>
        <div className="hero-bottomline"><span>INDEPENDENT RETAIL · SINCE DAY ONE</span><span>31°03' N — 72°57' E</span></div>
      </section>

      <section className="trust-strip"><div><Truck size={19} /><span><strong>Local delivery</strong><small>Across Samundri</small></span></div><div><PackageCheck size={19} /><span><strong>Shop-sized orders</strong><small>Order what you need</small></span></div><div><Clock3 size={19} /><span><strong>Personal service</strong><small>From a local supplier</small></span></div></section>

      {offers.length > 0 && <section className="offers-section" id="offers"><div className="section-heading"><div><span className="section-kicker">THIS WEEK AT THE SHOP</span><h2>Offers for your shelves</h2></div><span className="offer-count">{String(offers.length).padStart(2, '0')} LIVE</span></div><div className="offer-list">{offers.map((offer) => <article className="offer-row" key={offer.id}><span className="offer-spark">✳</span><div><h3>{offer.title}</h3><p>{offer.description}</p></div><strong>{offer.discount_percent ? `${offer.discount_percent}% OFF` : 'SPECIAL DEAL'}</strong></article>)}</div></section>}

      <section className="catalog-section" id="catalog">
        <div className="section-heading catalog-heading"><div><span className="section-kicker">THE EVERYDAY LINE-UP</span><h2>{ur ? 'دکان کا سامان' : 'Stock your shop'}</h2><p>{ur ? 'آپ کے گاہکوں کی پسندیدہ اشیاء، ایک ہی جگہ۔' : 'The everyday favourites your customers come in for.'}</p></div><div className="catalog-tools"><label className="search-field"><Search size={18} /><input aria-label="Search products" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ur ? 'مصنوعات تلاش کریں' : 'Search the catalogue'} /><kbd>/</kbd></label><button className="wishlist-link" onClick={() => { setQuery(''); setCategory('All items'); document.getElementById('catalog-grid')?.scrollIntoView({ behavior: 'smooth' }) }}><Heart size={16} />{wishlist.length || ''}</button></div></div>
        <div className="category-rail" role="tablist" aria-label="Product categories">{categories.map((item) => <button key={item} role="tab" aria-selected={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{ur ? categoryUrdu[item] : item}</button>)}</div>
        <div className="catalog-results"><span>{filtered.length} {ur ? 'مصنوعات' : 'products'}</span><span>Wholesale prices · PKR</span></div>
        <div className="product-grid" id="catalog-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} onReview={setReviewProduct} />)}</div>
        {!filtered.length && <div className="empty-state"><Search size={24} /><h3>No products found</h3><p>Try another search or category.</p></div>}
      </section>

      <section className="local-section" id="about"><div className="local-image"><span>YOUR TOWN,<br />YOUR PARTNER.</span></div><div className="local-copy"><span className="section-kicker">ROOTED IN SAMUNDRI</span><h2>Close by.<br /><em>Ready to help.</em></h2><p>From Chak Bazar to shops across town, Malik Adrees helps independent retailers keep their shelves moving with reliable everyday essentials.</p><div className="local-place"><MapPin size={17} /><span><strong>Chak Bazar, Samundri</strong><small>Clock Tower · Punjab, Pakistan</small></span></div><a href="#catalog" className="text-link">Browse shop essentials <ArrowRight size={16} /></a></div></section>

      <section className="contact-band" id="complaints"><div><span className="section-kicker">NEED A HAND?</span><h2>Let’s keep your shop moving.</h2><p className="complaint-urdu">شکایت یا ریٹنگ کے لیے رابطہ کریں</p><p>For an order question, feedback or a product request, contact your local supplier.</p></div><div className="contact-actions">{whatsappNumber ? <a href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="button button--light">WhatsApp <ArrowRight size={16} /></a> : <span className="button button--light" aria-disabled="true">WhatsApp <ArrowRight size={16} /></span>}<span>{whatsappNumber ? 'Contact your local supplier' : 'Phone number coming soon'}</span></div></section><section className="complaint-form-band"><div><span className="section-kicker">SEND A MESSAGE</span><h2>How can we help?</h2><p>Share a complaint, a rating or a product request with the store owner.</p></div><form onSubmit={sendComplaint}><textarea aria-label="Your complaint or request" required value={complaintText} onChange={(event) => setComplaintText(event.target.value)} rows="3" placeholder="Write your message" /><button className="button button--dark">Send message <ArrowRight size={16} /></button>{complaintNotice && <span role="status">{complaintNotice}</span>}</form></section>
      <section className="history-mini"><div><span className="section-kicker">YOUR RECENT ORDERS</span><h2>Order history</h2></div>{customer ? <div className="history-list">{orders.filter((order) => order.customer_id === customer.id || order.phone === customer.phone).slice(0, 2).map((order) => <div className="history-item" key={order.id}><span>{dateTime(order.created_at)}</span><strong>{money(order.total)}</strong><span className="status-pill">{order.status}</span></div>)}{orders.filter((order) => order.customer_id === customer.id || order.phone === customer.phone).length === 0 && <p>Your previous orders will appear here.</p>}<Link to="/account" className="text-link">View account <ArrowRight size={15} /></Link></div> : <p className="history-prompt">Sign in or register your shop to see order updates. <Link to="/account">Open your account <ArrowRight size={15} /></Link></p>}</section>
    </main>
    <footer className="site-footer"><Link to="/" className="brand-lockup"><span className="brand-mark">M<span>+</span></span><span className="brand-copy"><strong>MALIK ADREES</strong><small>SHOP & SUPPLY</small></span></Link><span>Biscuits · Snacks · Drinks · Daily essentials</span><span>© {COPYRIGHT_YEAR} Malik Adrees</span><Link to="/owner" className="footer-owner">Owner access <ArrowRight size={13} /></Link></footer>

    {cartOpen && <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setCartOpen(false)}><aside className="cart-drawer"><div className="drawer-header"><div><span className="section-kicker">YOUR SHOPPING BAG</span><h2>{cart.length} {cart.length === 1 ? 'item' : 'items'}</h2></div><button className="icon-button" aria-label="Close cart" onClick={() => setCartOpen(false)}><X size={20} /></button></div>{cart.length ? <><div className="cart-items">{cart.map((item) => <div className="cart-item" key={item.id}><img src={item.image} alt="" /><div className="cart-item-info"><strong>{item.name}</strong><span>{money(item.price)}</span><div className="quantity-control"><button aria-label="Decrease quantity" onClick={() => item.quantity === 1 ? setCart(cart.filter((entry) => entry.id !== item.id)) : updateQuantity(item.id, -1)}><Minus size={13} /></button><span>{item.quantity}</span><button aria-label="Increase quantity" onClick={() => updateQuantity(item.id, 1)}><Plus size={13} /></button></div></div><strong>{money(item.price * item.quantity)}</strong></div>)}</div><div className="drawer-total"><span>Estimated total</span><strong>{money(cartTotal)}</strong><small>Delivery details confirmed at checkout.</small></div><button className="button button--dark checkout-button" onClick={() => { setCartOpen(false); if (!customer) navigate('/account'); else setCheckout(true) }}>Continue to checkout <ArrowRight size={17} /></button></> : <div className="drawer-empty"><ShoppingBag size={30} /><h3>Your bag is waiting</h3><p>Add a few shop favourites to get started.</p><button className="button button--dark" onClick={() => setCartOpen(false)}>Browse catalogue</button></div>}</aside></div>}
    {checkout && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setCheckout(false)}><form className="checkout-modal" onSubmit={submitOrder}><button type="button" className="modal-close icon-button" onClick={() => setCheckout(false)}><X size={19} /></button><span className="section-kicker">FINAL STEP</span><h2>Delivery details</h2><p className="modal-subtitle">Order for {customer?.shop_name}, {customer?.address}</p><label className="location-label">Delivery location <span>Optional</span></label><button type="button" className="location-button" onClick={captureLocation} disabled={locating}><MapPin size={17} />{locating ? 'Getting your location…' : location || 'Share delivery location'}{location && <Check size={16} />}</button><small className="form-hint">Your browser will ask for permission. Coordinates are shared with the store owner.</small><div className="checkout-summary"><span>{cart.reduce((sum, item) => sum + item.quantity, 0)} items</span><strong>{money(cartTotal)}</strong></div><button className="button button--dark checkout-button" type="submit">Place order <ArrowRight size={17} /></button></form></div>}
    {success && <div className="modal-backdrop"><div className="success-modal"><div className="success-mark"><Check size={29} /></div><span className="section-kicker">ORDER RECEIVED</span><h2>🎉 شکریہ</h2><p>آپ کا آرڈر کامیابی سے موصول ہوگیا ہے۔</p><p className="success-english">Your order is with us. We’ll follow up about delivery shortly.</p><button className="button button--dark" onClick={() => setSuccess(false)}>Back to the shop <ArrowRight size={17} /></button></div></div>}
    {reviewProduct && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setReviewProduct(null)}><form className="review-modal" onSubmit={submitReview}><button type="button" className="modal-close icon-button" onClick={() => setReviewProduct(null)}><X size={19} /></button><span className="section-kicker">SHOP CUSTOMER REVIEW</span><h2>{reviewProduct.name}</h2><div className="star-picker" aria-label="Choose a rating">{[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" aria-label={`${star} stars`} onClick={() => setReviewStars(star)}><Star size={25} fill={star <= reviewStars ? 'currentColor' : 'none'} /></button>)}</div><label className="field-label">Your review<textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} rows="3" placeholder="Share a note with other shop owners" /></label><button className="button button--dark checkout-button">Submit review</button></form></div>}
    {!supabaseEnabled && <div className="local-mode-note">Local preview mode · Connect Supabase to sync between devices</div>}
  </div>
}
