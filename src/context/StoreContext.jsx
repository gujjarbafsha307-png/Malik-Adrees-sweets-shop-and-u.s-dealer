import { useEffect, useState } from 'react'
import { starterProducts } from '../data/products'
import { hasSupabase, supabase } from '../lib/supabase'
import { StoreContext } from './store-value'
const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(`malik-${key}`)) ?? fallback } catch { return fallback }
}
const persist = (key, value) => localStorage.setItem(`malik-${key}`, JSON.stringify(value))
const normalizeProduct = (item, ratings = []) => {
  const productRatings = ratings.filter((rating) => rating.product_id === item.id)
  const ratingAverage = productRatings.length ? productRatings.reduce((sum, rating) => sum + rating.stars, 0) / productRatings.length : 0
  return { ...item, image: item.image_url ?? item.image, stock: item.stock_quantity ?? item.stock, category: item.category ?? 'General Store', rating: ratingAverage, reviews: productRatings.length }
}

export function StoreProvider({ children }) {
  const [products, setProducts] = useState(() => read('products', starterProducts))
  const [orders, setOrders] = useState(() => read('orders', []))
  const [customers, setCustomers] = useState(() => read('customers', []))
  const [offers, setOffers] = useState(() => read('offers', []))
  const [ratings, setRatings] = useState(() => read('ratings', []))
  const [complaints, setComplaints] = useState(() => read('complaints', []))
  const [cart, setCart] = useState(() => read('cart', []))
  const [wishlist, setWishlist] = useState(() => read('wishlist', []))
  const [customer, setCustomer] = useState(() => read('customer', null))
  const [role, setRole] = useState(() => read('role', ''))
  const [language, setLanguage] = useState(() => read('language', 'en'))
  const [ready, setReady] = useState(false)

  useEffect(() => {
    for (const [key, value] of Object.entries({ products, orders, customers, offers, ratings, complaints, cart, wishlist, customer, role, language })) persist(key, value)
  }, [products, orders, customers, offers, ratings, complaints, cart, wishlist, customer, role, language])

  useEffect(() => {
    let active = true
    async function sync() {
      if (!hasSupabase) { setReady(true); return }
      const [productResult, orderResult, customerResult, offerResult, ratingResult, reviewResult, complaintResult] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
        supabase.from('customers').select('id, full_name, phone, shop_name, address, created_at').order('created_at', { ascending: false }),
        supabase.from('offers').select('*').order('created_at', { ascending: false }),
        supabase.from('ratings').select('*, customers(full_name), products(name)').order('created_at', { ascending: false }),
        supabase.from('reviews').select('*, customers(full_name), products(name)').order('created_at', { ascending: false }),
        supabase.from('complaints').select('*, customers(full_name, phone, shop_name)').order('created_at', { ascending: false }),
      ])
      if (!active) return
      if (productResult.data?.length) setProducts(productResult.data.map((item) => normalizeProduct(item, ratingResult.data || [])))
      if (orderResult.data) setOrders(orderResult.data)
      if (customerResult.data) setCustomers(customerResult.data)
      if (offerResult.data) setOffers(offerResult.data)
      if (ratingResult.data) setRatings(ratingResult.data.map((rating) => ({ ...rating, review: reviewResult.data?.find((review) => review.product_id === rating.product_id && review.customer_id === rating.customer_id)?.body || '' })))
      if (complaintResult.data) setComplaints(complaintResult.data)
      setReady(true)
    }
    sync().catch(() => { if (active) setReady(true) })
    if (hasSupabase) {
      const channel = supabase.channel('store-products').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
        const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
        if (data && active) setProducts((current) => data.map((item) => {
          const previous = current.find((product) => product.id === item.id)
          return { ...normalizeProduct(item), rating: previous?.rating || 0, reviews: previous?.reviews || 0 }
        }))
      }).subscribe()
      const orderChannel = supabase.channel('store-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
        const { data } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false })
        if (data && active) setOrders(data)
      }).subscribe()
      return () => { active = false; supabase.removeChannel(channel); supabase.removeChannel(orderChannel) }
    }
    return () => { active = false }
  }, [])

  async function saveProduct(product) {
    let image = product.image
    if (hasSupabase && image?.startsWith('data:')) {
      const [header, encoded] = image.split(',')
      const mimeType = header.match(/data:(.*?);base64/)?.[1] || 'image/jpeg'
      const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
      const filePath = `${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0)), { contentType: mimeType, upsert: true })
      if (uploadError) throw uploadError
      image = supabase.storage.from('product-images').getPublicUrl(filePath).data.publicUrl
    }
    const next = { ...product, image, id: product.id || crypto.randomUUID(), stock: Number(product.stock), price: Number(product.price) }
    if (hasSupabase) {
      const { error } = await supabase.from('products').upsert({ id: next.id, name: next.name, image_url: next.image, description: next.description, category: next.category, price: next.price, stock_quantity: next.stock, updated_at: new Date().toISOString() })
      if (error) throw error
    }
    setProducts((items) => items.some((item) => item.id === next.id) ? items.map((item) => item.id === next.id ? next : item) : [next, ...items])
    return next
  }

  async function deleteProduct(id) {
    if (hasSupabase) { const { error } = await supabase.from('products').delete().eq('id', id); if (error) throw error }
    setProducts((items) => items.filter((item) => item.id !== id))
  }

  async function addCustomer(details, password) {
    const record = { id: crypto.randomUUID(), ...details, created_at: new Date().toISOString() }
    if (hasSupabase) {
      const { data: auth, error: authError } = await supabase.auth.signUp({ phone: details.phone, password, options: { data: { account_type: 'customer', full_name: details.full_name, shop_name: details.shop_name, address: details.address } } })
      if (authError) throw authError
      if (!auth.session || !auth.user) throw new Error('Phone verification is required. Confirm your number, then sign in to finish registration.')
      const { data, error } = await supabase.from('customers').select('*').eq('id', auth.user.id).single()
      if (error) throw error
      Object.assign(record, data)
    }
    setCustomers((items) => [record, ...items.filter((item) => item.phone !== record.phone)])
    setCustomer(record)
    setRole('customer')
    return record
  }

  async function signInCustomer(phone, password) {
    if (!hasSupabase) throw new Error('Account sign-in is available when Supabase is connected.')
    const { data, error } = await supabase.auth.signInWithPassword({ phone, password })
    if (error) throw error
    const { data: profile, error: profileError } = await supabase.from('customers').select('*').eq('id', data.user.id).single()
    if (profileError) throw profileError
    setCustomer(profile)
    setRole('customer')
    await refreshAccountData()
    return profile
  }

  async function refreshAccountData() {
    if (!hasSupabase) return
    const [orderResult, customerResult, offerResult, ratingResult, reviewResult, complaintResult] = await Promise.all([
      supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
      supabase.from('customers').select('id, full_name, phone, shop_name, address, created_at').order('created_at', { ascending: false }),
      supabase.from('offers').select('*').order('created_at', { ascending: false }),
      supabase.from('ratings').select('*, customers(full_name), products(name)').order('created_at', { ascending: false }),
      supabase.from('reviews').select('*, customers(full_name), products(name)').order('created_at', { ascending: false }),
      supabase.from('complaints').select('*, customers(full_name, phone, shop_name)').order('created_at', { ascending: false }),
    ])
    if (orderResult.data) setOrders(orderResult.data)
    if (customerResult.data) setCustomers(customerResult.data)
    if (offerResult.data) setOffers(offerResult.data)
    if (ratingResult.data) {
      setRatings(ratingResult.data.map((rating) => ({ ...rating, review: reviewResult.data?.find((review) => review.product_id === rating.product_id && review.customer_id === rating.customer_id)?.body || '' })))
      setProducts((all) => all.map((product) => normalizeProduct(product, ratingResult.data)))
    }
    if (complaintResult.data) setComplaints(complaintResult.data)
  }

  async function ownerSignIn(username, password) {
    if (!hasSupabase) {
      if (import.meta.env.PROD) throw new Error('Owner access is disabled until Supabase is configured.')
      if (username !== 'Ayan' || password !== '000467') throw new Error('Username or password is incorrect.')
      setRole('owner')
      return true
    }
    const email = import.meta.env.VITE_OWNER_EMAIL
    if (!email) throw new Error('Set VITE_OWNER_EMAIL to the owner Auth account before using the dashboard.')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const { data: owner, error: ownerError } = await supabase.from('owners').select('user_id').eq('user_id', data.user.id).eq('username', username).maybeSingle()
    if (ownerError || !owner) { await supabase.auth.signOut(); throw new Error('This account does not have store owner access.') }
    setRole('owner')
    await refreshAccountData()
    return true
  }

  async function ownerSignOut() {
    if (hasSupabase) await supabase.auth.signOut()
    setRole('')
  }

  async function customerSignOut() {
    if (hasSupabase) await supabase.auth.signOut()
    setCustomer(null)
    setRole('')
  }

  async function placeOrder({ items, deliveryLocation }) {
    if (!customer) throw new Error('Please register your shop before placing an order.')
    for (const item of items) {
      const current = products.find((product) => product.id === item.id)
      if (!current || current.stock < item.quantity) throw new Error(`${item.name} does not have enough stock for this order.`)
    }
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const record = { id: crypto.randomUUID(), customer_id: customer.id, customer_name: customer.full_name, phone: customer.phone, shop_name: customer.shop_name, address: customer.address, delivery_location: deliveryLocation || '', total, status: 'Received', created_at: new Date().toISOString(), items: items.map((item) => ({ product_id: item.id, product_name: item.name, product_image: item.image, price: item.price, quantity: item.quantity })) }
    if (hasSupabase) {
      const { data, error } = await supabase.rpc('place_store_order', { p_delivery_location: deliveryLocation || null, p_items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })) })
      if (error) throw error
      const { data: savedOrder, error: orderError } = await supabase.from('orders').select('*, order_items(*)').eq('id', data).single()
      if (orderError) throw orderError
      Object.assign(record, savedOrder, { items: savedOrder.order_items })
    }
    setOrders((all) => [record, ...all])
    if (!hasSupabase) setProducts((all) => all.map((product) => {
      const orderItem = items.find((item) => item.id === product.id)
      return orderItem ? { ...product, stock: product.stock - orderItem.quantity } : product
    }))
    setCart([])
    return record
  }

  async function updateOrderStatus(id, status) {
    if (hasSupabase) { const { error } = await supabase.from('orders').update({ status }).eq('id', id); if (error) throw error }
    setOrders((all) => all.map((order) => order.id === id ? { ...order, status } : order))
  }

  async function submitComplaint(message) {
    const record = { id: crypto.randomUUID(), customer_id: customer?.id || null, customer_name: customer?.full_name || 'Shop customer', phone: customer?.phone || '', shop_name: customer?.shop_name || '', message, status: 'Open', created_at: new Date().toISOString() }
    if (hasSupabase) {
      if (!customer) throw new Error('Please sign in before sending a complaint.')
      const { data, error } = await supabase.from('complaints').insert({ customer_id: customer.id, message }).select().single()
      if (error) throw error
      Object.assign(record, data)
    }
    setComplaints((all) => [record, ...all])
    return record
  }

  async function saveOffer(offer) {
    const record = { id: crypto.randomUUID(), ...offer, created_at: new Date().toISOString() }
    if (hasSupabase) { const { error } = await supabase.from('offers').insert({ title: record.title, description: record.description, discount_percent: Number(record.discount_percent || 0), active: true }); if (error) throw error }
    setOffers((all) => [record, ...all])
  }

  async function saveRating(productId, stars, review) {
    const product = products.find((item) => item.id === productId)
    const record = { id: crypto.randomUUID(), product_id: productId, customer_id: customer?.id, stars, review, customer_name: customer?.full_name || 'Shop customer', created_at: new Date().toISOString() }
    if (hasSupabase) {
      if (!customer) throw new Error('Please register your shop before leaving a rating.')
      const { error } = await supabase.from('ratings').insert({ product_id: productId, customer_id: record.customer_id, stars })
      if (error) throw error
      if (review.trim()) { const { error: reviewError } = await supabase.from('reviews').insert({ product_id: productId, customer_id: record.customer_id, body: review }); if (reviewError) throw reviewError }
    }
    setRatings((all) => [record, ...all])
    setProducts((all) => all.map((item) => item.id === productId ? { ...item, rating: (((item.rating || 0) * (item.reviews || 0)) + stars) / ((item.reviews || 0) + 1), reviews: (item.reviews || 0) + 1 } : item))
    return { ...record, product_name: product?.name }
  }

  const value = { products, orders, customers, offers, ratings, complaints, cart, setCart, wishlist, setWishlist, customer, setCustomer, role, setRole, language, setLanguage, ready, saveProduct, deleteProduct, addCustomer, signInCustomer, customerSignOut, ownerSignIn, ownerSignOut, placeOrder, updateOrderStatus, submitComplaint, saveOffer, saveRating, supabaseEnabled: hasSupabase }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
