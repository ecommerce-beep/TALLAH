import BasePage from "../base-page";
import("../partials/eye-model").catch(() => {});
class ProductCard extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    // Parse product data
    this.product = this.product || JSON.parse(this.getAttribute("product"));
    if (window.app?.status === "ready") {
      this.onReady();

    } else {
      document.addEventListener("theme::ready", () => this.onReady());
    }
  }

 async onReady() {
    this.fitImageHeight = salla.config.get("store.settings.product.fit_type");
    this.placeholder = salla.url.asset(
      salla.config.get("theme.settings.placeholder")
    );
    await this.getProductImage(this.product.id);
    this.getProps();

    this.source = salla.config.get("page.slug");
    // If the card is in the landing page, hide the add button and show the quantity
    if (this.source == "landing-page") {
      this.hideAddBtn = true;
      this.showQuantity = window.showQuantity;
    }

    salla.lang.onLoaded(() => {
      // Language
      this.remained = salla.lang.get("pages.products.remained");
      this.donationAmount = salla.lang.get("pages.products.donation_amount");
      this.startingPrice = salla.lang.get("pages.products.starting_price");
      this.addToCart = salla.lang.get("pages.cart.add_to_cart");
      this.outOfStock = salla.lang.get("pages.products.out_of_stock");
      
      // re-render to update translations
      this.render();
    });

    this.render();
  }

  initCircleBar() {
    let qty = this.product.quantity,
      total = this.product.quantity > 100 ? this.product.quantity * 2 : 100,
      roundPercent = (qty / total) * 100,
      bar = this.querySelector(".s-product-card-content-pie-svg-bar"),
      strokeDashOffsetValue = 100 - roundPercent;
    bar.style.strokeDashoffset = strokeDashOffsetValue;
  }

  formatDate(date) {
    let d = new Date(date);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  async getProductImage(productId) {
  // المفتاح للتخزين المؤقت
  const cacheKey = `product_${productId}_details`;
  
  // 1. جرب تجيب البيانات من الكاش أولاً
  const cachedData = sessionStorage.getItem(cacheKey);
  
  if (cachedData) {
    const parsedData = JSON.parse(cachedData);
    
    this.images = parsedData.images || [];
    this.hasSecondImage = this.images.length > 1;
    this.options = parsedData.options || [];
  } 
  else {
    // 2. إذا مفيش في الكاش، روح جيب من السيرفر
    
    try {
      const response = await salla.product.getDetails(productId, ["images", "options"]);
      
      this.images = response?.data?.images || [];
      this.hasSecondImage = this.images.length > 1;
      this.options = response?.data?.options || [];
      
      // 3. خزن البيانات في الكاش عشان المرة الجاية
      const dataToCache = {
        images: this.images,
        options: this.options,
        timestamp: new Date().getTime()
      };
      
      sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache));
      
    } catch (error) {
      console.error(`❌ خطأ في جلب بيانات المنتج ${productId}:`, error);
      // استخدم البيانات الأساسية إذا فشل الطلب
      this.images = this.product?.images || [];
      this.hasSecondImage = this.images.length > 1;
      this.options = this.product?.options || [];
    }
  }
  
  // 4. باقي الكود كما هو
  this.mainImage = this.product?.image?.url || this.product?.thumbnail;
  this.secondImage = this.hasSecondImage ? this.images[1]?.url : null;

  // تجميع الأوبشنز حسب النوع
  this.groupedOptions = this.options.reduce((acc, opt) => {
    if (!acc[opt.type]) acc[opt.type] = [];
    acc[opt.type].push(opt);
    return acc;
  }, {});

  // 🎨 كل color options
  this.colorOptions = this.groupedOptions["color"] || [];

  // 📏 كل single-option
  this.singleOptions = this.groupedOptions["single-option"] || [];

  // 🖼 thumbnail
  this.thumbnailOptions = this.groupedOptions["thumbnail"] || [];
}


  getProductBadge() {
  const isArabic = document.documentElement.lang === 'ar';

  if (this.product?.preorder?.label) {
    return `<div class="s-product-card-promotion-title min-w-fit">
      ${this.product.preorder.label}
    </div>`;
  }

  if (this.product.promotion_title) {
    return `<div class="s-product-card-promotion-title min-w-fit">
      ${this.product.promotion_title} ${isArabic ? 'خصم' : 'off'}
    </div>`;
  }
    if (this.showQuantity && this.product?.quantity) {
      return `<div
        class="s-product-card-quantity">${this.remained} ${salla.helpers.number(
        this.product?.quantity
      )}</div>`;
    }
    if (this.showQuantity && this.product?.is_out_of_stock) {
      return `<div class="s-product-card-out-badge">${this.outOfStock}</div>`;
    }
    return "";
  }

  getPriceFormat(price) {
    if (!price || price == 0) {
      return salla.config.get("store.settings.product.show_price_as_dash")
        ? "-"
        : "";
    }

    return salla.money(price);
  }

  getProductPrice() {
    let price = "";
    if (this.product.is_on_sale) {
      price = `<div class="s-product-card-sale-price">
                <h4 class="text-[clamp(1rem,0.9282rem+0.3218vw,1.25rem)] !text-font">${this.getPriceFormat(
                  this.product.sale_price
                )}</h4>
                <span class=" text-[clamp(.8rem,0.9282rem+0.3218vw,1rem)]] !text-graytext">${this.getPriceFormat(
                  this.product?.regular_price
                )}</span>
              </div>`;
    } else if (this.product.starting_price) {
      price = `<div class="s-product-card-starting-price">
                  <p class="text-[clamp(1rem,0.9282rem+0.3218vw,1.25rem)] !text-font">${
                    this.startingPrice
                  }</p>
                  <h4 class="text-[clamp(1rem,0.9282rem+0.3218vw,1.25rem)] !text-font"> ${this.getPriceFormat(
                    this.product?.starting_price
                  )} </h4>
              </div>`;
    } else {
      price = `<h4 class="s-product-card-price text-[clamp(1rem,0.9282rem+0.3218vw,1.25rem)] !text-font">${this.getPriceFormat(
        this.product?.price
      )}</h4>`;
    }

    return price;
  }

  getAddButtonLabel() {
    if (this.product.has_preorder_campaign) {
      return salla.lang.get("pages.products.pre_order_now");
    }

    if (this.product.status === "sale" && this.product.type === "booking") {
      return salla.lang.get("pages.cart.book_now");
    }

    if (this.product.status === "sale") {
      return salla.lang.get("pages.cart.add_to_cart");
    }

    if (this.product.type !== "donating") {
      return salla.lang.get("pages.products.out_of_stock");
    }

    // donating
    return salla.lang.get("pages.products.donation_exceed");
  }

  getProps() {
    /**
     *  Horizontal card.
     */
    this.horizontal = this.hasAttribute("horizontal");

    /**
     *  Support shadow on hover.
     */
    this.shadowOnHover = this.hasAttribute("shadowOnHover");

    /**
     *  Hide add to cart button.
     */
    this.hideAddBtn = this.hasAttribute("hideAddBtn");

    /**
     *  Full image card.
     */
    this.fullImage = this.hasAttribute("fullImage");

    /**
     *  Minimal card.
     */
    this.minimal = this.hasAttribute("minimal");

    /**
     *  Special card.
     */
    this.isSpecial = this.hasAttribute("isSpecial");

    /**
     *  Show quantity.
     */
    this.showQuantity = this.hasAttribute("showQuantity");
  }

  escapeHTML(str = "") {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  render() {
      const MAX_VISIBLE = 3;
      const isArabic = document.documentElement.lang === "ar";

const renderOption = (option) =>  {
  const items = option.details || [];

const SIZE_LABEL = isArabic ? "المقاس" : "Size";
const COLOR_LABEL = isArabic ? "اللون" : "Color";
  const visible = items.slice(0, MAX_VISIBLE);
  const remaining = items.length - MAX_VISIBLE;
  // 🎨 COLOR
  if (option.type === "color") {
    return `
    <div class="colors-wrapper mb-3">
    ${window.option_images?
      `<span class="block">
        ${COLOR_LABEL} : <span class="selected-color font-semibold ${this.product.status !== 'sale' ? 'pointer-events-none opacity-50':''}"></span>
      </span>`:``
    }
        <div
          class="colors flex gap-2 flex-wrap"
          data-color-option="${option.id}"
        >
          ${visible.map(item => `
            <span
              class="w-6 h-6 rounded-full border  inline-block ${this.product.status !== 'sale' ? 'pointer-events-none opacity-50':' cursor-pointer'} transition-all duration-200"
              style="background-color:${item.color}"
              title="${item.name}"
              data-option-id="${item.id}">
            </span>
          `).join("")}

          ${remaining > 0 ? `
            <span class="w-6 h-6 flex items-center justify-center text-xs border rounded-full bg-gray-100 text-gray-700">
              +${remaining}
            </span>
          ` : ""}
        </div>
      </div>
    `;
  }

  // 📏 SINGLE OPTION

  if (option.type === "single-option") {
    return `
      <div class="sizes-wrapper mb-3 ${this.product.status !== 'sale' ? 'pointer-events-none opacity-50':''}">
       ${window.option_images?
      `<span class="block">
        ${SIZE_LABEL} :  <span class="selected-size font-semibold"></span>
      </span>`:``
    }
        <div
          class="sizes flex gap-2 flex-wrap"
          data-single-option="${option.id}"
        >
          ${visible.map(item => `
            <button
              class="px-2 py-1  md:px-[18px] md:py-[7px] border  border-[#9F9FA9] text-sm transition-all duration-200 
              ${this.product.status !== 'sale' ? 'pointer-events-none opacity-50 strike-diagonal':'cursor-pointer'}
              "
             ${this.product.status !== 'sale' ? 'disabled="disabled"' : ""}
              data-option-id="${item.id}">
              ${item.name}
            </button>
          `).join("")}

          ${remaining > 0 ? `
            <span class="px-2 py-1  md:px-[18px] md:py-[7px] border border-[#9F9FA9] text-sm transition-all duration-200 flex items-center justify-center">
              +${remaining}
            </span>
          ` : ""}
        </div>
      </div>
    `;
  }

  return "";
}
    this.classList.add("s-product-card-entry");
    this.setAttribute("id", this.product.id);
    !this.horizontal && !this.fullImage && !this.minimal
      ? this.classList.add("s-product-card-vertical")
      : "";
    this.horizontal && !this.fullImage && !this.minimal
      ? this.classList.add("s-product-card-horizontal")
      : "";
    this.fitImageHeight && !this.isSpecial && !this.fullImage && !this.minimal
      ? this.classList.add("s-product-card-fit-height")
      : "";
    this.isSpecial ? this.classList.add("s-product-card-special") : "";
    this.fullImage ? this.classList.add("s-product-card-full-image") : "";
    this.minimal ? this.classList.add("s-product-card-minimal") : "";
    this.product?.donation ? this.classList.add("s-product-card-donation") : "";
    this.shadowOnHover ? this.classList.add("s-product-card-shadow") : "";
    this.product?.is_out_of_stock
      ? this.classList.add("s-product-card-out-of-stock")
      : "";
    this.isInWishlist =
      !salla.config.isGuest() &&
      salla.storage
        .get("salla::wishlist", [])
        .includes(Number(this.product.id));
    this.innerHTML = `
        <div class="${
          !this.fullImage ? "s-product-card-image" : "s-product-card-image-full"
        }">
         <a href="${this.product?.url}" class="product-flip-wrapper"${this.product?.image?.alt ? '' : ` aria-label="${String(this.product?.name ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`}>
  <div class="product-flip-inner ${this.hasSecondImage ? 'has-flip' : ''}">

            <img
              class=" product-flip-face !absolute front s-product-card-image-${salla.url.is_placeholder(this.mainImage)
                ? 'contain'
                : this.fitImageHeight || 'cover'} lazy"
              src="${this.placeholder}"
              alt="${this.product?.image?.alt || ''}"
              data-src="${this.mainImage}"
            />

            ${
              this.hasSecondImage
                ? `
                <img
                  class="product-flip-face !absolute back lazy"
                  src="${this.placeholder}"
                  alt="${this.product?.image?.alt || ''}"
                  data-src="${this.secondImage}"
                />
                `
                : ''
            }

          </div>

          ${!this.fullImage && !this.minimal ? this.getProductBadge() : ''}
        </a>
          ${
            this.fullImage
              ? `<a href="${this.product?.url}" aria-label="${String(this.product?.name ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" class="s-product-card-overlay"></a>`
              : ""
          }
         ${
           !this.horizontal && !this.fullImage
             ? `

           <div class="flex  gap-1 md:gap-2 absolute top-[5px] opacity-100 z-10 right-2  md:-top-10 flex-action transition-all duration-300">
               <salla-button
                    shape="icon"
                    fill="outline"
                    color="light"
                    name="product-name-${this.product.id}"
                    aria-label="show quick modal"
                    class=" s-product-card-quick-btn eye-model-style"
                    onclick="openEyeModel('${this.product.id}')"
                    data-modal-id="quick-view-modal"
                    loader-position="center"
                    data-id="${this.product.id}">
                    <i class="sicon-eye"></i>
                </salla-button>
                <salla-button
                  shape="icon"
                  fill="outline"
                  color="light"
                  name="product-name-${this.product.id}"
                  aria-label="Add or remove to wishlist"
                  class="s-product-card-wishlist-btn animated ${
                    this.isInWishlist
                      ? "s-product-card-wishlist-added pulse-anime"
                      : "not-added un-favorited"
                  }"
                  onclick="salla.wishlist.toggle(${this.product.id})"
                  data-id="${this.product.id}">
                              <span class="relative">
                      <!-- Filled Heart -->
                      <svg class="filled" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                          <path d="M305 151.1L320 171.8L335 151.1C360 116.5 400.2 96 442.9 96C516.4 96 576 155.6 576 229.1L576 231.7C576 343.9 436.1 474.2 363.1 529.9C350.7 539.3 335.5 544 320 544C304.5 544 289.2 539.4 276.9 529.9C203.9 474.2 64 343.9 64 231.7L64 229.1C64 155.6 123.6 96 197.1 96C239.8 96 280 116.5 305 151.1z"/>
                      </svg>

                      <!-- Empty Heart -->
                      <svg class="not_filled" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                          <path d="M442.9 144C415.6 144 389.9 157.1 373.9 179.2L339.5 226.8C335 233 327.8 236.7 320.1 236.7C312.4 236.7 305.2 233 300.7 226.8L266.3 179.2C250.3 157.1 224.6 144 197.3 144C150.3 144 112.2 182.1 112.2 229.1C112.2 279 144.2 327.5 180.3 371.4C221.4 421.4 271.7 465.4 306.2 491.7C309.4 494.1 314.1 495.9 320.2 495.9C326.3 495.9 331 494.1 334.2 491.7C368.7 465.4 419 421.3 460.1 371.4C496.3 327.5 528.2 279 528.2 229.1C528.2 182.1 490.1 144 443.1 144zM335 151.1C360 116.5 400.2 96 442.9 96C516.4 96 576 155.6 576 229.1C576 297.7 533.1 358 496.9 401.9C452.8 455.5 399.6 502 363.1 529.8C350.8 539.2 335.6 543.9 320 543.9C304.4 543.9 289.2 539.2 276.9 529.8C240.4 502 187.2 455.5 143.1 402C106.9 358.1 64 297.7 64 229.1C64 155.6 123.6 96 197.1 96C239.8 96 280 116.5 305 151.1L320 171.8L335 151.1z"/>
                      </svg>
                  </span>
                </salla-button>

               
          </div>
          ${this.product.status =='out' ? 
            `
            <span class="absolute top-0 left-0 bg-background px-[10px] out py-[6px]">${isArabic ? "نفذت الكمية":"Out of Stock" }</span>
            `:``
          }
           <div class="hidden in_single">
                   <salla-add-product-button 
                    fill="none" 
                    shape="icon" 
                    product-id="${this.product.id}"
                    product-status="${this.product.status}"
                    product-type="${this.product.type}">
                    <i class="text-base text-[13px] sicon-${
                      this.product.type == "booking"
                        ? "calendar-time"
                        : "shopping-bag"
                    }"></i>
                  </salla-add-product-button>
            </div>
${window.option_images && window.product_card_options ? `
            <div class="card-floating-btn hidden md:block md:opacity-0 absolute md:bottom-[-100%] transition-all duration-700 w-full bg-[color-mix(in_srgb,var(--color-background)_90%,transparent)] p-3">
                   
              ${window.product_card_options ?`<div class="s-product-card-content-options flex flex-col mb-2">
            ${this.options.map(opt => renderOption(opt)).join("")}
            ${this.product.status !== "sale" ? `
              
              <button
                class="w-full py-[6px] md:py-3 flex items-center justify-center gap-2 p-0  notify text-center bg-primary text-background"
                ${this.product.status !== "sale" ? "" : ""}>
            ${isArabic ? "ذكرني  عند توافرة":"Notify Me" } <i class="sicon-bell"></i>
            </button>
              `:`<button
                class="salla-add-product-button transition-all duration-300 w-full py-[6px] md:py-3 flex items-center justify-center p-0  text-center bg-primary text-font"
                ${this.product.status !== 'sale' ? 'disabled="disabled"' : ""}>

            <span class="text-background add-icon">${
              this.product.add_to_cart_label
                ? this.product.add_to_cart_label
                : this.getAddButtonLabel()
            }</span>
              <i class="loader text-font hidden animate-spin sicon-loading text-base"></i>
            </button>`}

          </div>
          
          `:``}
            `:`
            `}
            </div>
            `
             : ``
         }
         ${
           this.horizontal
             ? `

           <div class="flex flex-col gap-1 md:gap-2 absolute right-[5px] opacity-100 z-20 top-2  md:-right-10  flex-action transition-all duration-300">
               <salla-button
                    shape="icon"
                    fill="outline"
                    color="light"
                    name="product-name-${this.product.id}"
                    aria-label="show quick modal"
                    class=" s-product-card-quick-btn eye-model-style"
                    onclick="openEyeModel('${this.product.id}')"
                    data-modal-id="quick-view-modal"
                    loader-position="center"
                    data-id="${this.product.id}">
                    <i class="sicon-eye"></i>
                </salla-button>
                <salla-button
                  shape="icon"
                  fill="outline"
                  color="light"
                  name="product-name-${this.product.id}"
                  aria-label="Add or remove to wishlist"
                  class="s-product-card-wishlist-btn animated ${
                    this.isInWishlist
                      ? "s-product-card-wishlist-added pulse-anime"
                      : "not-added un-favorited"
                  }"
                  onclick="salla.wishlist.toggle(${this.product.id})"
                  data-id="${this.product.id}">
                              <span class="relative">
                      <!-- Filled Heart -->
                      <svg class="filled" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                          <path d="M305 151.1L320 171.8L335 151.1C360 116.5 400.2 96 442.9 96C516.4 96 576 155.6 576 229.1L576 231.7C576 343.9 436.1 474.2 363.1 529.9C350.7 539.3 335.5 544 320 544C304.5 544 289.2 539.4 276.9 529.9C203.9 474.2 64 343.9 64 231.7L64 229.1C64 155.6 123.6 96 197.1 96C239.8 96 280 116.5 305 151.1z"/>
                      </svg>

                      <!-- Empty Heart -->
                      <svg class="not_filled" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                          <path d="M442.9 144C415.6 144 389.9 157.1 373.9 179.2L339.5 226.8C335 233 327.8 236.7 320.1 236.7C312.4 236.7 305.2 233 300.7 226.8L266.3 179.2C250.3 157.1 224.6 144 197.3 144C150.3 144 112.2 182.1 112.2 229.1C112.2 279 144.2 327.5 180.3 371.4C221.4 421.4 271.7 465.4 306.2 491.7C309.4 494.1 314.1 495.9 320.2 495.9C326.3 495.9 331 494.1 334.2 491.7C368.7 465.4 419 421.3 460.1 371.4C496.3 327.5 528.2 279 528.2 229.1C528.2 182.1 490.1 144 443.1 144zM335 151.1C360 116.5 400.2 96 442.9 96C516.4 96 576 155.6 576 229.1C576 297.7 533.1 358 496.9 401.9C452.8 455.5 399.6 502 363.1 529.8C350.8 539.2 335.6 543.9 320 543.9C304.4 543.9 289.2 539.2 276.9 529.8C240.4 502 187.2 455.5 143.1 402C106.9 358.1 64 297.7 64 229.1C64 155.6 123.6 96 197.1 96C239.8 96 280 116.5 305 151.1L320 171.8L335 151.1z"/>
                      </svg>
                  </span>
                </salla-button>
          </div>
            `
             : ``
         }
        </div>
        <div class="s-product-card-content justify-center flex-grow">
          ${
            this.isSpecial && this.product?.quantity
              ? `<div class="s-product-card-content-pie">
              <span>
                <b>${salla.helpers.number(this.product?.quantity)}</b>
                ${this.remained}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -1 36 34" class="s-product-card-content-pie-svg">
                <circle cx="16" cy="16" r="15.9155" class="s-product-card-content-pie-svg-base" />
                <circle cx="16" cy="16" r="15.9155" class="s-product-card-content-pie-svg-bar" />
              </svg>
            </div>`
              : ``
          }
          <div class="s-product-card-content-category ">
            <h3 class="line-clamp-1 text-[clamp(0.75rem,0.75rem+0vw,0.75rem)] font-normal !leading-[19.93px] md:leading-6 text-primary">
              <a class="!leading-[24px]" href="${
                this.product?.category?.url
              }">${this.product?.category?.name}</a>
            </h3>
            </div>
          <div class="s-product-card-content-main ${
            this.isSpecial ? "s-product-card-content-extra-padding" : ""
          }">
          ${!window.option_images ? `
    ${window.product_card_options ?`<div class="s-product-card-content-options flex flex-col mb-2">
  ${this.options.map(opt => renderOption(opt)).join("")}
</div>`:``}
  `: window.option_images && window.product_card_options ? `
    <div class="md:hidden s-product-card-content-options flex flex-col mb-2">
      ${this.options.map(opt => renderOption(opt)).join("")}
    </div>
  ` : ``}
        
          
            <h3 class="s-product-card-content-title line-clamp-2 text-[clamp(0.875rem,0.8032rem+0.3218vw,1.125rem)] font-normal !leading-[24px] text-graytext">
              <a class="!leading-[24px]" href="${this.product?.url}">${
      this.product?.name
    }</a>
            </h3>

            ${
              this.product?.subtitle && !this.minimal
                ? `<p class="s-product-card-content-subtitle opacity-80 line-clamp-1 hidden">${this.product?.subtitle}</p>`
                : ``
            }
          </div>
          ${
            this.product?.donation && !this.minimal && !this.fullImage
              ? `<salla-progress-bar donation=${JSON.stringify(
                  this.product?.donation
                )}></salla-progress-bar>
          <div class="s-product-card-donation-input">
            ${
              this.product?.donation?.can_donate
                ? `<label for="donation-amount-${this.product.id}">${
                    this.donationAmount
                  } <span>*</span></label>
              <input
                type="text"
                onInput="${(e) => {
                  salla.helpers.inputDigitsOnly(e.target);
                  this.addBtn.donatingAmount = e.target.value;
                }}"
                id="donation-amount-${this.product.id}"
                name="donating_amount"
                class="s-form-control"
                placeholder="${this.donationAmount}" />`
                : ``
            }
          </div>`
              : ""
          }
          <div class="s-product-card-content-sub flex-grow mt-auto !mb-0 !items-end ${
            this.isSpecial ? "s-product-card-content-extra-padding" : ""
          }">
            ${
              this.product?.donation?.can_donate
                ? ""
                : !this.horizontal && !this.fullImage
                ? `
    <div class="flex items-center gap-3 justify-between w-full">
      <span class="product-price">${this.getProductPrice()}</span>
      <div class="flex items-center justify-center  gap-2">
      ${
              this.product?.rating?.stars
                ? `<div class="s-product-card-rating">
                <i class="sicon-star2 before:text-orange-300"></i>
                <span>${this.product.rating.stars}</span>
              </div>`
                : ``
            }
            ${
  this.product.status !== "sale"
    ? `
      <button class="${window.option_images ? 'md:hidden' : ''} md:text-base md:py-[9px] md:px-[20px] notify
      text-[12px] md:rounded-[40px] md:h-fit md:w-fit 
       w-8 h-8 flex items-center justify-center p-0 bg-[#F4F4F5] rounded-full 
      
      ">
      <span class="md:block hidden">
      ${isArabic ? "ذكرني":"Notify Me" } <i class="sicon-bell"></i>
      </span>
        <i class="sicon-bell block md:hidden"></i>
      </button>
    `
    : (!window.product_card_options && !window.option_images)
      ? `
        <salla-add-product-button
          fill="none"
          shape="icon"
          product-id="${this.product.id}"
          product-status="${this.product.status}"
          product-type="${this.product.type}">
          <i class="text-base sicon-${
            this.product.type === "booking"
              ? "calendar-time"
              : "shopping-bag"
          }"></i>
        </salla-add-product-button>
      `
      : `
        <button
          class="salla-add-product-button ${window.option_images ? 'md:hidden' : ''} w-8 h-8 flex items-center justify-center p-0 bg-[#F4F4F5] rounded-full">
          <i class="text-base add-icon sicon-${
            this.product.type === "booking"
              ? "calendar-time"
              : "shopping-bag"
          }"></i>
          <i class="loader hidden animate-spin sicon-loading"></i>
        </button>
      `}
            
          

           
            
      </div>
    
     
    </div>
  `
                : `
    ${this.getProductPrice()}
  `
            }

            
          </div>

          ${
            this.isSpecial && this.product.discount_ends
              ? `<salla-count-down date="${this.formatDate(
                  this.product.discount_ends
                )}" end-of-day=${true} boxed=${true}
              labeled=${true} />`
              : ``
          }


          ${
            !this.hideAddBtn
              ? `<div class="s-product-card-content-footer gap-2 !hidden">
            <div class="hidden">
            <salla-add-product-button fill="outline" width="wide"
            product-id="${this.product.id}"
            product-status="${this.product.status}"
            product-type="${this.product.type}">
            ${
              this.product.status == "sale"
                ? `<i class="text-base sicon-${
                    this.product.type == "booking"
                      ? "calendar-time"
                      : "shopping-bag"
                  }"></i>`
                : ``
            }
            <span>${
              this.product.add_to_cart_label
                ? this.product.add_to_cart_label
                : this.getAddButtonLabel()
            }</span>
            </salla-add-product-button>
            </div>

              ${
                this.horizontal || this.fullImage
                  ? `
                  <div class="hidden">
                  <salla-button 
                  shape="icon" 
                  fill="outline" 
                  color="light" 
                  id="card-wishlist-btn-${this.product.id}-horizontal"
                  aria-label="Add or remove to wishlist"
                  class="s-product-card-wishlist-btn animated ${
                    this.isInWishlist
                      ? "s-product-card-wishlist-added pulse-anime"
                      : "not-added un-favorited"
                  }"
                  onclick="salla.wishlist.toggle(${this.product.id})"
                  data-id="${this.product.id}">
                  <i class="sicon-heart"></i> 
                  </salla-button>
                  </div>
                  `
                  : ``
              }
            </div>`
              : ``
          }
        </div>
      `;

    this.querySelectorAll('[name="donating_amount"]').forEach((element) => {
      element.addEventListener("input", (e) => {
        e.target
          .closest(".s-product-card-content")
          .querySelector("salla-add-product-button")
          .setAttribute("donating-amount", e.target.value);
      });
    });

    document.lazyLoadInstance?.update(this.querySelectorAll(".lazy"));

    if (this.product?.quantity && this.isSpecial) {
      this.initCircleBar();
    }
   
// ==========================================
// المتغيرات لتخزين الخيارات المختارة
const selectedOptions = {};
const checkOptionsCompletion = () => {
  // كل الاوبشنز المطلوبة
  const requiredOptions = this.options.filter(opt => opt.required);

  // هل كلها متختارة؟
  const allSelected = requiredOptions.every(
    opt => selectedOptions[opt.id]
  );

  this.querySelectorAll(".salla-add-product-button").forEach((btn) => {
    if (allSelected) {
      btn.classList.add("btn-ready");
    } else {
      btn.classList.remove("btn-ready");
    }
  });
};

// الخيار المخفي (مثل thumbnail)

// ==========================================
// إعداد الخيار المخفي (thumbnail)
if (this.thumbnailOptions.length > 0) {
  this.thumbnailOptions.forEach(opt => {
    if (opt.details?.length) {
      selectedOptions[opt.id] = opt.details[0].id;
    }
  });
}

// ==========================================
// اختيار اللون (إذا كان موجود)
this.colorOptions.forEach(option => {
  this.querySelectorAll(`[data-color-option="${option.id}"] span[data-option-id]`)
    .forEach(el => {
      el.addEventListener("click", () => {
        selectedOptions[option.id] = el.dataset.optionId;

        // UI active ring
        el.parentElement.querySelectorAll("span[data-option-id]")
          .forEach(s => s.classList.remove("ring-2", "ring-primary"));
        el.classList.add("ring-2", "ring-primary");

        // ✅ تحديث النص جنب color
        const wrapper = el.closest(".colors-wrapper");
        const label = wrapper.querySelector(".selected-color");
        if (label) {
          label.textContent = el.getAttribute("title");
        }
        checkOptionsCompletion();
      });
    });
});



// ==========================================
// اختيار المقاس (إذا كان موجود)
this.singleOptions.forEach(option => {
  this.querySelectorAll(`[data-single-option="${option.id}"] button`)
    .forEach(el => {
      el.addEventListener("click", () => {
        selectedOptions[option.id] = el.dataset.optionId;

        // UI active button
        el.parentElement.querySelectorAll("button")
          .forEach(b => b.classList.remove("bg-primary", "text-background"));
        el.classList.add("bg-primary", "text-background");

        // ✅ تحديث النص جنب size
        const wrapper = el.closest(".sizes-wrapper");
        const label = wrapper.querySelector(".selected-size");
        if (label) {
          label.textContent = el.textContent.trim();
        }
      checkOptionsCompletion();
      });
    });
});



// =========================================
// زر "أضف للسلة"
// NOTE: there can be more than one add-to-cart button rendered for the
// same product (e.g. the mobile inline button + the desktop floating
// panel button), so we bind a click handler to ALL of them instead of
// only the first match.
const addBtns = this.querySelectorAll(".salla-add-product-button");

addBtns.forEach((addBtn) => {
  addBtn.addEventListener("click", async () => {
    if (addBtn.disabled || addBtn.classList.contains("loading")) return;

    const isArabic = salla.config.language === "ar";

    // =============================
    // Required validation
    const missing = this.options.find(
      opt => opt.required && !selectedOptions[opt.id]
    );

    if (missing) {
      salla.notify.error(
        isArabic
          ? `من فضلك اختر ${missing.name}`
          : `Please select ${missing.name}`
      );
      return;
    }

    // =============================
    // START LOADING
    addBtn.classList.add("loading");
    addBtn.disabled = true;

    const icon = addBtn.querySelector(".add-icon");
    const loader = addBtn.querySelector(".loader");

    if (icon) icon.classList.add("hidden");
    if (loader) loader.classList.remove("hidden");

    try {
      const res = await salla.cart.addItem({
        id: this.product.id,
        quantity: 1,
        options: selectedOptions
      });

      if (!res.success) {
        throw new Error(res.error || "Add to cart failed");
      }

    } catch (err) {
      console.error(err);
      salla.notify.error(
        isArabic
          ? "حدث خطأ أثناء الإضافة"
          : "Something went wrong"
      );
    } finally {
      // =============================
      // STOP LOADING
      addBtn.classList.remove("loading");
      addBtn.disabled = false;

      if (icon) icon.classList.remove("hidden");
      if (loader) loader.classList.add("hidden");
    }
  });
});
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".notify");
  if (btn) {
    window.openNewsletterModal();
  }
});

  }
}

customElements.define("custom-salla-product-card", ProductCard);