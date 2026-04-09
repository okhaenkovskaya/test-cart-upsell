class UpsellVariantPicker {
  constructor(root) {
    if (!root) return;

    this.root = root;
    this.wrappers = [...root.querySelectorAll('.upsell-card__variants')];

    this.init();
    this.initAjaxAddToCart();
  }

  init() {
    this.wrappers.forEach(wrapper => {
      const radiosRoot = wrapper.querySelector('variant-radios');
      if (!radiosRoot) return;

      const jsonEl = radiosRoot.querySelector('script[type="application/json"]');
      radiosRoot.variants = jsonEl ? JSON.parse(jsonEl.textContent.trim()) : [];

      wrapper.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', e => this.onChange(e, wrapper, radiosRoot));
      });
    });
  }

  initAjaxAddToCart() {
    if (window.__upsellAjaxBound) return;
    window.__upsellAjaxBound = true;

    document.addEventListener('submit', async (e) => {
      const form = e.target.closest('.upsell-list__item form');
      if (!form) return;

      e.preventDefault();
      const formData = new FormData(form);

      try {
        await fetch('/cart/add.js', {
          method: 'POST',
          body: formData
        });

        const isCartPage =
          document.body.classList.contains('template-cart') ||
          window.location.pathname === '/cart';

        if (isCartPage) {
          await this.updateCartPage();
        } else {
          await this.updateCartDrawer();
        }

        document.dispatchEvent(new CustomEvent('cart:updated'));
      } catch (err) {
        console.error('Upsell AJAX add error:', err);
      }
    });
  }


  async updateCartDrawer() {
    const drawer = document.querySelector('cart-drawer');
    if (!drawer) return;

    const res = await fetch(`${window.routes?.cart_url || '/cart'}?section_id=cart-drawer`);
    if (!res.ok) return;

    const html = await res.text();
    const temp = document.createElement('div');
    temp.innerHTML = html;

    const newDrawer = temp.querySelector('cart-drawer');
    if (newDrawer) drawer.innerHTML = newDrawer.innerHTML;
  }

  async updateCartPage() {
    const cartItems = document.querySelector('cart-items');
    if (!cartItems) return;

    const res = await fetch(`${window.routes?.cart_url || '/cart'}?section_id=main-cart-items`);
    if (!res.ok) return;

    const html = await res.text();
    const temp = document.createElement('div');
    temp.innerHTML = html;

    const newCart = temp.querySelector('cart-items');
    if (newCart) cartItems.innerHTML = newCart.innerHTML;
  }

  onChange(e, wrapper, radiosRoot) {
    const form = wrapper.closest('.upsell-list__item')?.querySelector('form');
    if (!form) return;

    const input = form.querySelector('.upsell-card__variant-id');
    if (!input) return;

    const selectedOptions = [...wrapper.querySelectorAll('fieldset')].map(fs =>
      fs.querySelector('input[type="radio"]:checked')?.value
    );

    const variant = this.findVariant(radiosRoot.variants, selectedOptions);
    if (!variant) return;

    input.value = variant.id;

    radiosRoot.currentVariant = variant;
    radiosRoot.onVariantChange?.();

    this.updatePrice(wrapper, variant);
    this.updateButton(wrapper, variant);
  }

  findVariant(variants, selectedOptions) {
    return variants.find(v =>
      v.options.every((opt, i) => opt === selectedOptions[i])
    );
  }

  updateButton(wrapper, variant) {
    const productId = wrapper.dataset.productId;
    const button = wrapper.closest('.upsell-list__item')
      ?.querySelector(`#ProductSubmitButton-${wrapper.dataset.section}-${productId} button`);

    if (!button) return;

    const buttonText = button.querySelector('span');
    const addToCartLabel = button.dataset.addToCart || 'Add to cart';
    const soldOutLabel = button.dataset.soldOut || 'Sold out';

    if (variant.available) {
      button.disabled = false;
      button.classList.remove('sold-out');
      buttonText.textContent = addToCartLabel;
    } else {
      button.disabled = true;
      button.classList.add('sold-out');
      buttonText.textContent = soldOutLabel;
    }
  }

  updatePrice(wrapper, variant) {
    const productId = wrapper.dataset.productId;
    const priceRoot = wrapper.closest('.upsell-list__item')
      ?.querySelector(`#upsell-price-${productId}`);

    if (!priceRoot) return;

    const regularEl = priceRoot.querySelector('.price-item--regular');
    const saleEl = priceRoot.querySelector('.price-item--sale');
    const priceContainer = priceRoot.querySelector('.price');

    const price = variant.price;
    const compare = variant.compare_at_price;

    if (compare && compare > price) {
      priceContainer.classList.add('price--on-sale');
      if (regularEl) regularEl.innerHTML = `<s>${formatMoney(compare)}</s>`;
      if (saleEl) saleEl.textContent = formatMoney(price);
    } else {
      priceContainer.classList.remove('price--on-sale');
      if (regularEl) regularEl.textContent = formatMoney(price);
      if (saleEl) saleEl.textContent = '';
    }
  }
}

window.initUpsellVariantPickers = function (root = document) {
  new UpsellVariantPicker(root);
};
