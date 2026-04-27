'use strict';
/* ═══════════════════════════════════════════
   DATABASE LAYER — localStorage
   مستودع قطع الغيار
═══════════════════════════════════════════ */

var DB = {
  /* ── Keys ── */
  K: {
    entries:   'wh_entries',
    products:  'wh_products',
    suppliers: 'wh_suppliers',
    users:     'wh_users',
    activity:  'wh_activity',
    settings:  'wh_settings',
    auth:      'wh_auth',
    minStock:  'wh_minstock',
  },

  /* ── Helpers ── */
  get: function(key) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch(e) { return null; }
  },
  set: function(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch(e) { return false; }
  },

  /* ── Entries (movements) ── */
  getEntries: function()       { return this.get(this.K.entries)   || []; },
  setEntries: function(arr)    { return this.set(this.K.entries, arr); },
  addEntry:   function(entry)  {
    var arr = this.getEntries();
    entry.id = Date.now() + Math.random();
    arr.unshift(entry);
    this.setEntries(arr);
    this.logActivity('entry', entry.type === 'in' ? 'إضافة: ' + entry.name + ' (' + entry.qty + ')' : 'صرف: ' + entry.name + ' (' + entry.qty + ')');
    return entry;
  },
  updateEntry: function(id, changes) {
    var arr = this.getEntries();
    var idx = arr.findIndex(function(e){ return e.id === id; });
    if (idx < 0) return false;
    Object.assign(arr[idx], changes);
    this.setEntries(arr);
    this.logActivity('edit', 'تعديل: ' + (arr[idx].name || id));
    return true;
  },
  deleteEntry: function(id) {
    var arr = this.getEntries();
    var entry = arr.find(function(e){ return e.id === id; });
    this.setEntries(arr.filter(function(e){ return e.id !== id; }));
    if (entry) this.logActivity('delete', 'حذف: ' + entry.name);
    return true;
  },

  /* ── Stock summary ── */
  getStock: function() {
    var entries  = this.getEntries();
    var minStock = this.get(this.K.minStock) || {};
    var map = {};
    entries.forEach(function(e) {
      if (!map[e.barcode]) {
        map[e.barcode] = {
          barcode: e.barcode, name: e.name, size: e.size || '',
          location: e.location || '', price: parseFloat(e.price) || 0,
          inQty: 0, outQty: 0, supplier: e.supplier || ''
        };
      }
      if (e.type === 'in')  map[e.barcode].inQty  += e.qty;
      else                  map[e.barcode].outQty += e.qty;
      if (e.name)     map[e.barcode].name     = e.name;
      if (e.size)     map[e.barcode].size     = e.size;
      if (e.location) map[e.barcode].location = e.location;
      if (e.price)    map[e.barcode].price    = parseFloat(e.price) || 0;
      if (e.supplier) map[e.barcode].supplier = e.supplier;
    });
    var list = Object.values(map).map(function(item) {
      item.balance = item.inQty - item.outQty;
      item.value   = item.balance * item.price;
      item.minStock = minStock[item.barcode] || 0;
      item.lowStock = item.minStock > 0 && item.balance <= item.minStock;
      return item;
    });
    return list.sort(function(a,b){ return a.name.localeCompare(b.name,'ar'); });
  },

  /* ── Suppliers ── */
  getSuppliers: function()       { return this.get(this.K.suppliers) || []; },
  addSupplier:  function(s)      { var arr = this.getSuppliers(); s.id = Date.now(); arr.push(s); this.set(this.K.suppliers, arr); return s; },
  updateSupplier: function(id,c) { var arr = this.getSuppliers(); var i = arr.findIndex(function(s){return s.id===id;}); if(i>=0){Object.assign(arr[i],c);this.set(this.K.suppliers,arr);} },
  deleteSupplier: function(id)   { this.set(this.K.suppliers, this.getSuppliers().filter(function(s){return s.id!==id;})); },

  /* ── Users ── */
  getUsers: function() {
    var users = this.get(this.K.users);
    if (!users || users.length === 0) {
      users = [{ id: 1, username: 'admin', password: '1234', role: 'admin', name: 'المدير العام', lastLogin: null, active: true }];
      this.set(this.K.users, users);
    }
    return users;
  },
  addUser:    function(u)    { var arr = this.getUsers(); u.id = Date.now(); arr.push(u); this.set(this.K.users, arr); return u; },
  updateUser: function(id,c) { var arr = this.getUsers(); var i = arr.findIndex(function(u){return u.id===id;}); if(i>=0){Object.assign(arr[i],c);this.set(this.K.users,arr);} },
  deleteUser: function(id)   { this.set(this.K.users, this.getUsers().filter(function(u){return u.id!==id;})); },

  /* ── Auth ── */
  login: function(username, password) {
    var users = this.getUsers();
    var user  = users.find(function(u){ return u.username === username && u.password === password && u.active !== false; });
    if (!user) return null;
    this.updateUser(user.id, { lastLogin: new Date().toISOString() });
    var session = { id: user.id, username: user.username, name: user.name, role: user.role, time: Date.now() };
    this.set(this.K.auth, session);
    this.logActivity('login', 'تسجيل دخول: ' + user.name);
    return session;
  },
  logout: function() {
    var s = this.getSession();
    if (s) this.logActivity('logout', 'تسجيل خروج: ' + s.name);
    localStorage.removeItem(this.K.auth);
  },
  getSession: function() {
    var s = this.get(this.K.auth);
    if (!s) return null;
    // Session expires after 24h
    if (Date.now() - s.time > 86400000) { localStorage.removeItem(this.K.auth); return null; }
    return s;
  },
  requireAuth: function(requiredRole) {
    var s = this.getSession();
    if (!s) { window.location.href = 'index.html'; return null; }
    if (requiredRole === 'admin' && s.role !== 'admin') { window.location.href = 'dashboard.html'; return null; }
    return s;
  },

  /* ── Activity log ── */
  logActivity: function(type, desc) {
    var s    = this.getSession();
    var log  = this.get(this.K.activity) || [];
    var now  = new Date();
    log.unshift({
      id:   Date.now(),
      type: type,
      desc: desc,
      user: s ? s.name : 'النظام',
      role: s ? s.role : '',
      time: now.toISOString(),
      date: now.toLocaleDateString('ar-SA-u-nu-latn') + '  ' + now.toLocaleTimeString('ar-SA-u-nu-latn',{hour:'2-digit',minute:'2-digit'})
    });
    if (log.length > 1000) log = log.slice(0, 1000);
    this.set(this.K.activity, log);
  },
  getActivity: function() { return this.get(this.K.activity) || []; },

  /* ── Settings ── */
  getSettings: function() {
    return this.get(this.K.settings) || { companyName: 'مستودع قطع الغيار', currency: 'ر.س', minStockDefault: 5 };
  },
  setSettings: function(s) { this.set(this.K.settings, s); },

  /* ── Min stock ── */
  getMinStock:      function()       { return this.get(this.K.minStock) || {}; },
  setMinStock:      function(bc, v)  { var m = this.getMinStock(); m[bc] = v; this.set(this.K.minStock, m); },

  /* ── Stats for dashboard ── */
  getStats: function() {
    var entries  = this.getEntries();
    var stock    = this.getStock();
    var now      = new Date();
    var todayStr = now.toLocaleDateString('ar-SA-u-nu-latn');
    var totalValue = stock.reduce(function(s,i){ return s + i.value; }, 0);
    var lowStockItems = stock.filter(function(i){ return i.lowStock; });
    var todayIn  = entries.filter(function(e){ return e.type==='in'  && e.date && e.date.startsWith(todayStr); }).reduce(function(s,e){return s+e.qty;},0);
    var todayOut = entries.filter(function(e){ return e.type==='out' && e.date && e.date.startsWith(todayStr); }).reduce(function(s,e){return s+e.qty;},0);

    // Last 7 days chart data
    var days = [];
    for (var d = 6; d >= 0; d--) {
      var day = new Date(now); day.setDate(day.getDate() - d);
      var dayStr = day.toLocaleDateString('ar-SA-u-nu-latn');
      var label  = d === 0 ? 'اليوم' : day.toLocaleDateString('ar-SA-u-nu-latn',{weekday:'short'});
      days.push({
        label: label,
        inQty:  entries.filter(function(e){return e.type==='in'  && e.date && e.date.startsWith(dayStr);}).reduce(function(s,e){return s+e.qty;},0),
        outQty: entries.filter(function(e){return e.type==='out' && e.date && e.date.startsWith(dayStr);}).reduce(function(s,e){return s+e.qty;},0),
      });
    }

    // Top 5 moving parts
    var movingMap = {};
    entries.forEach(function(e){
      if (!movingMap[e.barcode]) movingMap[e.barcode] = { name: e.name, total: 0 };
      movingMap[e.barcode].total += e.qty;
    });
    var topParts = Object.values(movingMap).sort(function(a,b){return b.total-a.total;}).slice(0,5);

    return {
      totalParts:    stock.length,
      totalValue:    totalValue,
      lowStockCount: lowStockItems.length,
      lowStockItems: lowStockItems,
      todayIn:       todayIn,
      todayOut:      todayOut,
      totalMovements:entries.length,
      chartDays:     days,
      topParts:      topParts,
    };
  }
};
