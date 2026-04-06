class UpsellVariantPicker {
  constructor(root) {
    this.root = root;
    this.init();
  }

  init() {
    this.root
      .querySelectorAll('.upsell-card__variants input[type="radio"]')
      .forEach(radio => {
        radio.addEventListener('change', e => this.onChange(e));
      });
  }

  onChange(e) {
    const wrapper = e.target.closest('.upsell-card__variants');
    const radios = wrapper.querySelector('variant-radios');
    const form = wrapper.closest('.upsell-list__item')?.querySelector('form');
    const input = form.querySelector('.upsell-card__variant-id');

    const variants = JSON.parse(
      radios.querySelector('script[type="application/json"]').textContent.trim()
    );

    const selectedOptions = [...wrapper.querySelectorAll('fieldset')].map(fs =>
      fs.querySelector('input[type="radio"]:checked')?.value
    );

    const variant = variants.find(v =>
      v.options.every((opt, i) => opt === selectedOptions[i])
    );

    if (!variant) return;

    input.value = variant.id;
    radios.currentVariant = variant;

    if (typeof radios.onVariantChange === 'function') {
      radios.onVariantChange();
    }

    this.updatePrice(wrapper, variant);
    this.updateButton(wrapper, variant);
  }

  updateButton(wrapper, variant) {
    const productId = wrapper.dataset.productId;
    const button = wrapper.closest('.upsell-list__item')
      ?.querySelector(`#ProductSubmitButton-${wrapper.dataset.section}-${productId} button`);

    if (!button) return;

    const buttonText = button.querySelector('span');

    if (variant.available) {
      button.disabled = false;
      button.classList.remove('sold-out');
      buttonText.textContent = 'Add to cart';
    } else {
      button.disabled = true;
      button.classList.add('sold-out');
      buttonText.textContent = 'Sold out';
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
