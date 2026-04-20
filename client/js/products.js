// Products page logic
document.addEventListener('DOMContentLoaded', () => {
  const productGrid = document.getElementById('productGrid');
  const modal = document.getElementById('productModal');
  const modalTitle = document.getElementById('modalTitle');
  const productForm = document.getElementById('productForm');
  const productIdField = document.getElementById('productId');
  const imagePreview = document.getElementById('imagePreview');

  loadProducts();

  // Event delegation for product action buttons
  productGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'edit') window.editProduct(id);
    else if (btn.dataset.action === 'delete') window.deleteProduct(id);
  });

  // Open add modal
  document.getElementById('addProductBtn').addEventListener('click', () => {
    resetForm();
    modalTitle.textContent = 'Add Product';
    modal.style.display = 'flex';
  });

  // Close modal
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Image preview
  document.getElementById('productImage').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        imagePreview.innerHTML = `<img src="${ev.target.result}" alt="Preview">`;
      };
      reader.readAsDataURL(file);
    }
  });

  // Save product
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveProductBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const formData = new FormData(productForm);
      const id = productIdField.value;

      if (id) {
        await api.upload(`/api/products/${id}`, formData, 'PUT');
      } else {
        await api.upload('/api/products', formData);
      }

      closeModal();
      loadProducts();
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Product';
    }
  });

  async function loadProducts() {
    try {
      const data = await api.get('/api/products');
      const products = data.products || data;

      if (!products || products.length === 0) {
        productGrid.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📦</div>
            <p>No products yet. Add your first product!</p>
          </div>`;
        return;
      }

      productGrid.innerHTML = products.map(p => `
        <div class="product-card">
          ${p.image_url
            ? `<img src="${escapeAttr(p.image_url)}" alt="${escapeAttr(p.name)}" class="product-image">`
            : `<div class="product-image-placeholder">📦</div>`
          }
          <div class="product-body">
            <div class="product-name">${escapeHtml(p.name)}</div>
            <div class="product-category">${escapeHtml(p.category || 'Uncategorized')}</div>
            <div class="product-meta">
              <span class="product-price">R${(p.price || 0).toFixed(2)}</span>
              <span class="product-stock ${(p.stock || 0) === 0 ? 'out' : (p.stock || 0) < 5 ? 'low' : ''}">${(p.stock || 0) === 0 ? 'Out of Stock' : `${p.stock || 0} in stock`}</span>
            </div>
            <div class="product-actions">
              <button class="btn btn-outline btn-sm" data-action="edit" data-id="${p._id}">Edit</button>
              <button class="btn btn-danger btn-sm" data-action="delete" data-id="${p._id}">Delete</button>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      productGrid.innerHTML = `<div class="empty-state"><p>Error loading products</p></div>`;
      console.error('Load products error:', err);
    }
  }

  // Make functions globally accessible for onclick handlers
  window.editProduct = async function (id) {
    try {
      const product = await api.get(`/api/products/${id}`);
      productIdField.value = product._id;
      document.getElementById('productName').value = product.name || '';
      document.getElementById('productDesc').value = product.description || '';
      document.getElementById('productPrice').value = product.price || '';
      document.getElementById('productStock').value = product.stock || 0;
      document.getElementById('productCategory').value = product.category || '';
      if (product.image_url) {
        imagePreview.innerHTML = `<img src="${escapeAttr(product.image_url)}" alt="Current">`;
      }
      modalTitle.textContent = 'Edit Product';
      modal.style.display = 'flex';
    } catch (err) {
      alert(err.message);
    }
  };

  window.deleteProduct = async function (id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/api/products/${id}`);
      loadProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  function closeModal() {
    modal.style.display = 'none';
    resetForm();
  }

  function resetForm() {
    productForm.reset();
    productIdField.value = '';
    imagePreview.innerHTML = '';
  }
});

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
