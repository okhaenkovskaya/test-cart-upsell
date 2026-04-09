if (!customElements.get('product-form')) {
  customElements.define('product-form', class ProductForm extends HTMLElement {
    constructor() {
      super();

      this.form = this.querySelector('form');
      const idInput = this.form.querySelector('[name=id]');
      if (idInput) idInput.disabled = false;
      this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
      this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
      this.submitButton = this.querySelector('[type="submit"]');
      if (document.querySelector('cart-drawer') && this.submitButton) this.submitButton.setAttribute('aria-haspopup', 'dialog');

      this.hideErrors = this.dataset.hideErrors === 'true';
      this.error = false;
    }

    async ensureCartDrawer() {
      if (this.cart) return;
      try {
        const res = await fetch(`${window.routes?.cart_url || '/cart'}?section_id=cart-drawer`, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        if (!res.ok) return;
        const html = await res.text();
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const newDrawer = temp.querySelector('cart-drawer');
        if (newDrawer) {
          document.body.appendChild(newDrawer);
          this.cart = newDrawer;
        }
      } catch (e) {
        console.error(e);
      }
    }

    onSubmitHandler(evt) {
      evt.preventDefault();
      if (!this.submitButton) return;
      if (this.submitButton.getAttribute('aria-disabled') === 'true') return;
      if (this.form.dataset.upsellSubmitting === 'true') return;

      this.handleErrorMessage();

      this.form.dataset.upsellSubmitting = 'true';
      this.submitButton.setAttribute('aria-disabled', 'true');
      this.submitButton.classList.add('loading');
      const spinner = this.querySelector('.loading-overlay__spinner');
      if (spinner) spinner.classList.remove('hidden');

      const config = fetchConfig('javascript');
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
      delete config.headers['Content-Type'];

      const formData = new FormData(this.form);
      if (this.cart) {
        try {
          formData.append('sections', this.cart.getSectionsToRender().map((section) => section.id));
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        } catch (e) {}
      }

      const sellingPlanId = (typeof window.getCurrentSellingPlanId === 'function') ? window.getCurrentSellingPlanId() : null;
      if (sellingPlanId) formData.append('selling_plan', sellingPlanId);

      config.body = formData;

      fetch(`${routes.cart_add_url}`, config)
        .then((response) => response.json())
        .then(async (response) => {
          if (response.status) {
            publish(PUB_SUB_EVENTS.cartError, {source: 'product-form', productVariantId: formData.get('id'), errors: response.description, message: response.message});
            this.handleErrorMessage(response.description);

            const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
            if (soldOutMessage) {
              this.submitButton.setAttribute('aria-disabled', 'true');
              const span = this.submitButton.querySelector('span');
              if (span) span.classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
            }
            this.error = true;
            return;
          }

          if (!this.cart) {
            await this.ensureCartDrawer();
          }

          if (!this.cart) {
            window.location = window.routes.cart_url;
            return;
          }

          if (!this.error) publish(PUB_SUB_EVENTS.cartUpdate, {source: 'product-form', productVariantId: formData.get('id')});
          this.error = false;
          const quickAddModal = this.closest('quick-add-modal');
          if (quickAddModal) {
            document.body.addEventListener('modalClosed', () => {
              setTimeout(() => { this.cart.renderContents(response); });
            }, { once: true });
            quickAddModal.hide(true);
          } else {
            this.cart.renderContents(response);
          }
        })
        .catch((e) => {
          console.error(e);
        })
        .finally(() => {
          this.submitButton.classList.remove('loading');
          if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
          if (!this.error) this.submitButton.removeAttribute('aria-disabled');
          if (spinner) spinner.classList.add('hidden');
          delete this.form.dataset.upsellSubmitting;
        });
    }

    handleErrorMessage(errorMessage = false) {
      if (this.hideErrors) return;

      this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
      if (!this.errorMessageWrapper) return;
      this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

      this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

      if (errorMessage) {
        this.errorMessage.textContent = errorMessage;
      }
    }
  });
}
