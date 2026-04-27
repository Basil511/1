'use strict';
/* ═══════════════════════════════════════
   Navigation & Shared Utilities
═══════════════════════════════════════ */

/* ── Toast ── */
var _toastTm;
function tst(msg, type) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.className = 'toast on' + (type ? ' ' + type : '');
  clearTimeout(_toastTm);
  _toastTm = setTimeout(function(){ t.className = 'toast'; }, 2800);
}

/* ── Nav active ── */
function initNav(activePage) {
  var session = DB.getSession();
  if (!session) { window.location.href = 'index.html'; return; }

  // Set user info
  var nameEl = document.getElementById('nav-username');
  var roleEl = document.getElementById('nav-role');
  var avatarEl = document.getElementById('nav-avatar');
  if (nameEl) nameEl.textContent = session.name;
  if (roleEl) roleEl.textContent = session.role === 'admin' ? 'مدير' : session.role === 'manager' ? 'مشرف' : 'مستعرض';
  if (avatarEl) avatarEl.textContent = session.name.charAt(0);

  // Set active nav item
  var items = document.querySelectorAll('.nav-item');
  items.forEach(function(item) {
    if (item.dataset.page === activePage) item.classList.add('active');
  });

  // Hide admin-only items
  if (session.role !== 'admin') {
    document.querySelectorAll('.admin-only').forEach(function(el){ el.style.display = 'none'; });
  }

  // Update low stock badge
  updateNavBadge();

  // Mobile menu
  var menuBtn = document.querySelector('.mobile-menu-btn');
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.querySelector('.sidebar-overlay');
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', function() { sidebar.classList.toggle('open'); overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none'; });
    if (overlay) overlay.addEventListener('click', function() { sidebar.classList.remove('open'); overlay.style.display = 'none'; });
  }
}

function updateNavBadge() {
  var badge = document.getElementById('low-stock-badge');
  if (!badge) return;
  var count = DB.getStock().filter(function(i){ return i.lowStock; }).length;
  if (count > 0) { badge.textContent = count; badge.style.display = ''; }
  else { badge.style.display = 'none'; }
}

function doLogout() {
  DB.logout();
  window.location.href = 'index.html';
}

/* ── Sidebar HTML ── */
function renderSidebar(activePage) {
  var session = DB.getSession();
  if (!session) return '';
  return `
<div class="sidebar" id="sidebar">
  <div class="sidebar-logo">
    <div class="sidebar-logo-ic">🔧</div>
    <div>
      <h2>مستودع قطع الغيار</h2>
      <p>نظام إدارة المخزون</p>
    </div>
  </div>
  <div class="sidebar-user">
    <div class="user-avatar" id="nav-avatar">${session.name.charAt(0)}</div>
    <div class="user-info">
      <p id="nav-username">${session.name}</p>
      <span id="nav-role">${session.role === 'admin' ? 'مدير' : session.role === 'manager' ? 'مشرف' : 'مستعرض'}</span>
    </div>
  </div>
  <nav class="sidebar-nav">
    <div class="nav-section-label">الرئيسية</div>
    <a href="dashboard.html" class="nav-item ${activePage==='dashboard'?'active':''}" data-page="dashboard">
      <span class="nav-icon">📊</span> لوحة التحكم
    </a>
    <div class="nav-section-label">المخزون</div>
    <a href="add.html" class="nav-item ${activePage==='add'?'active':''}" data-page="add">
      <span class="nav-icon">➕</span> إضافة للجرد
    </a>
    <a href="withdraw.html" class="nav-item ${activePage==='withdraw'?'active':''}" data-page="withdraw">
      <span class="nav-icon">➖</span> صرف من المخزون
    </a>
    <a href="inventory.html" class="nav-item ${activePage==='inventory'?'active':''}" data-page="inventory">
      <span class="nav-icon">📦</span> الجرد والحركة
    </a>
    <a href="stock.html" class="nav-item ${activePage==='stock'?'active':''}" data-page="stock">
      <span class="nav-icon">🗄️</span> المخزون الحالي
      <span class="nav-badge" id="low-stock-badge" style="display:none">0</span>
    </a>
    <div class="nav-section-label">الزيوت والكفرات</div>
    <a href="oils.html" class="nav-item ${activePage==='oils'?'active':''}" data-page="oils">
      <span class="nav-icon">🛢️</span> براميل الزيت
    </a>
    <a href="tires.html" class="nav-item ${activePage==='tires'?'active':''}" data-page="tires">
      <span class="nav-icon">🔄</span> الكفرات
    </a>
    <div class="nav-section-label">التقارير</div>
    <a href="reports.html" class="nav-item ${activePage==='reports'?'active':''}" data-page="reports">
      <span class="nav-icon">📈</span> التقارير
    </a>
    <a href="activity.html" class="nav-item ${activePage==='activity'?'active':''}" data-page="activity">
      <span class="nav-icon">📋</span> سجل النشاط
    </a>
    <div class="nav-section-label">الإدارة</div>
    <a href="suppliers.html" class="nav-item ${activePage==='suppliers'?'active':''}" data-page="suppliers">
      <span class="nav-icon">🏭</span> الموردون
    </a>
    <a href="users.html" class="nav-item admin-only ${activePage==='users'?'active':''}" data-page="users" ${session.role!=='admin'?'style="display:none"':''}>
      <span class="nav-icon">👥</span> المستخدمون
    </a>
  </nav>
  <div class="sidebar-footer">
    <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="doLogout()">
      <span>↩</span> تسجيل الخروج
    </button>
  </div>
</div>
<div class="sidebar-overlay"></div>
<button class="mobile-menu-btn" onclick="document.getElementById('sidebar').classList.toggle('open')">☰</button>
<div id="toast"></div>
`;
}

/* ── Formatters ── */
function fmtNum(n) { return Number(n || 0).toLocaleString('ar-SA'); }
function fmtMoney(n) { return fmtNum(Number(n || 0).toFixed(2)) + ' ر.س'; }
function fmtDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  return d.toLocaleDateString('ar-SA-u-nu-latn') + '  ' + d.toLocaleTimeString('ar-SA-u-nu-latn',{hour:'2-digit',minute:'2-digit'});
}

/* ── QR Code generator (simple SVG barcode placeholder) ── */
function generateQR(text, size) {
  size = size || 120;
  // Simple visual — use a real QR lib in production
  return `<div style="width:${size}px;height:${size}px;background:#fff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:9px;color:#000;padding:8px;text-align:center;word-break:break-all;border:2px solid rgba(180,210,255,.30)">${text}</div>`;
}

/* ── Confirm dialog ── */
function confirm2(msg, onYes) {
  var ov = document.getElementById('confirm-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'confirm-overlay';
    ov.className = 'modal-overlay';
    ov.innerHTML = `<div class="glass glass-sm modal-card" style="max-width:380px;text-align:center">
      <div style="font-size:36px;margin-bottom:12px">⚠️</div>
      <p id="confirm-msg" style="font-size:14px;color:var(--tx);margin-bottom:20px;line-height:1.6"></p>
      <div class="modal-btns" style="justify-content:center">
        <button class="btn btn-danger" id="confirm-yes">تأكيد</button>
        <button class="btn btn-primary" onclick="document.getElementById('confirm-overlay').classList.remove('on')">إلغاء</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
  }
  document.getElementById('confirm-msg').textContent = msg;
  ov.classList.add('on');
  var yesBtn = document.getElementById('confirm-yes');
  yesBtn.onclick = function() { ov.classList.remove('on'); onYes(); };
}
