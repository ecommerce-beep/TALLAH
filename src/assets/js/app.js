import MobileMenu from "mmenu-light";
import Swal from "sweetalert2";
import Anime from "./partials/anime";
import initTootTip from "./partials/tooltip";
import AppHelpers from "./app-helpers";
import "./partials/custom-search-panel.js";
import "./partials/custom-menu.js";
import "./partials/custom-menu-mobile.js";
import "./partials/custom-top-nav.js";

// The editor default (https://s.salla.sa) and links back to the current page are not subscription endpoints
function isUsableSubscriptionUrl(value) {
  if (!value || !value.trim()) return false;

  let url;
  try {
    url = new URL(value, window.location.href);
  } catch (error) {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const isEditorDefault =
    url.hostname === "s.salla.sa" && url.pathname === "/" && !url.search;
  const isCurrentPage =
    url.origin === window.location.origin &&
    url.pathname === window.location.pathname;

  return !isEditorDefault && !isCurrentPage;
}

class App extends AppHelpers {
  constructor() {
    super();
    window.app = this;
    window.openNewsletterModal = this.openNewsletterModal;
    window.isUsableSubscriptionUrl = isUsableSubscriptionUrl;
    global.openEyeModel = (id) => {
      import("./partials/eye-model")
        .then((eye) => {
          eye.eyeModel(id);
        })
        .catch((error) => {
          console.error("Failed to load eye model:", error);
        });
    };
  }

  loadTheApp() {
    this.commonThings();
    this.initiateNotifier();
    this.initiateMobileMenu();
    if (header_is_sticky) {
      this.initiateStickyMenu();
    }
    this.initAddToCart();
    this.initiateDropdowns();
    this.initiateModals();
    this.initiateCollapse();
    this.initAttachWishlistListeners();
    this.changeMenuDirection();
    initTootTip();
    this.loadModalImgOnclick();
    this.initSizeOptionSingle();
    this.observeSizeOptionSingle();
    this.initHideEndedCountDown();
    this.watchAndAdjustHeader();
    this.init_SideCart();
    this.initSideCartCoupon();
    salla.comment.event.onAdded(() => window.location.reload());

    this.status = "ready";
    document.dispatchEvent(new CustomEvent("theme::ready"));
    this.log("Theme Loaded 🎉");
  }

  log(message) {
    salla.log(`ThemeApp(Raed)::${message}`);
    return this;
  }

  // fix Menu Direction at the third level >> The menu at the third level was popping off the page
  changeMenuDirection() {
    app.all(".root-level.has-children", (item) => {
      if (item.classList.contains("change-menu-dir")) return;
      app.on("mouseover", item, () => {
        let submenu = item.querySelector(".sub-menu .sub-menu");
        if (submenu) {
          let rect = submenu.getBoundingClientRect();
          (rect.left < 10 || rect.right > window.innerWidth - 10) &&
            app.addClass(item, "change-menu-dir");
        }
      });
    });
  }

  loadModalImgOnclick() {
    document.querySelectorAll(".load-img-onclick").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        let modal = document.querySelector("#" + link.dataset.modalId),
          img = modal.querySelector("img"),
          imgSrc = img.dataset.src;
        modal.open();

        if (img.classList.contains("loaded")) return;

        img.src = imgSrc;
        img.classList.add("loaded");
      });
    });
  }

  commonThings() {
    this.cleanContentArticles(".content-entry");
  }

  cleanContentArticles(elementsSelector) {
    let articleElements = document.querySelectorAll(elementsSelector);

    if (articleElements.length) {
      articleElements.forEach((article) => {
        article.innerHTML = article.innerHTML.replace(/\&nbsp;/g, " ");
      });
    }
  }

  isElementLoaded(selector) {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (document.querySelector(selector)) {
          clearInterval(interval);
          return resolve(document.querySelector(selector));
        }
      }, 160);
    });
  }

  copyToClipboard(event) {
    event.preventDefault();
    let aux = document.createElement("input"),
      btn = event.currentTarget;
    aux.setAttribute("value", btn.dataset.content);
    document.body.appendChild(aux);
    aux.select();
    document.execCommand("copy");
    document.body.removeChild(aux);
    this.toggleElementClassIf(btn, "copied", "code-to-copy", () => true);
    setTimeout(() => {
      this.toggleElementClassIf(btn, "code-to-copy", "copied", () => true);
    }, 1000);
  }

  initiateNotifier() {
    salla.notify.setNotifier(function (message, type, data) {
      if (typeof message == "object") {
        return Swal.fire(message).then(type);
      }

      return Swal.mixin({
        toast: true,
        position: salla.config.get("theme.is_rtl") ? "top-start" : "top-end",
        showConfirmButton: false,
        timer: 2000,
        didOpen: (toast) => {
          toast.addEventListener("mouseenter", Swal.stopTimer);
          toast.addEventListener("mouseleave", Swal.resumeTimer);
        },
      }).fire({
        icon: type,
        title: message,
        showCloseButton: true,
        timerProgressBar: true,
      });
    });
  }

  initiateMobileMenu() {
    this.isElementLoaded("#mobile-menu").then((menu) => {
      const mobileMenu = new MobileMenu(
        menu,
        "(min-width: 0px)",
        "( slidingSubmenus: false)"
      );

      salla.lang.onLoaded(() => {
        mobileMenu.navigation({
          title: salla.lang.get("blocks.header.main_menu"),
        });
      });
      const drawer = mobileMenu.offcanvas({
        position: salla.config.get("theme.is_rtl") ? "right" : "left",
      });

      this.onClick("a[href='#mobile-menu']", (event) => {
        document.body.classList.add("menu-opened");
        event.preventDefault() || drawer.close() || drawer.open();
      });
      this.onClick(".close-mobile-menu", (event) => {
        document.body.classList.remove("menu-opened");
        event.preventDefault() || drawer.close();
      });
    });
  }
  initAttachWishlistListeners() {
    let isListenerAttached = false;

    function toggleFavoriteIcon(id, isAdded = true) {
      document
        .querySelectorAll('.s-product-card-wishlist-btn[data-id="' + id + '"]')
        .forEach((btn) => {
          app.toggleElementClassIf(
            btn,
            "s-product-card-wishlist-added",
            "not-added",
            () => isAdded
          );
          app.toggleElementClassIf(
            btn,
            "pulse-anime",
            "un-favorited",
            () => isAdded
          );
        });
    }

    function getLocalizedMessage(key) {
      const lang = document.documentElement.lang || "ar";
      const messages = {
        ar: {
          added: "تم اضافة المنتج لقائمة الأمنيات",
          removed: "تم حذف المنتج من قائمة الأمنيات",
        },
        en: {
          added: "Product added to wishlist",
          removed: "Product removed from wishlist",
        },
      };

      return messages[lang] ? messages[lang][key] : messages["ar"][key];
    }

    if (!isListenerAttached) {
      salla.wishlist.event.onAdded((event, id) => {
        toggleFavoriteIcon(id);
        salla.notify.success(getLocalizedMessage("added"));
      });

      salla.wishlist.event.onRemoved((event, id) => {
        toggleFavoriteIcon(id, false);
        salla.notify.success(getLocalizedMessage("removed"));
      });

      isListenerAttached = true;
    }
  }
watchAndAdjustHeader() {
    function adjust() {
        const ad = document.querySelector('salla-advertisement');
        const adHidden = ad && (ad.style.height === '0px' || getComputedStyle(ad).height === '0px');
        
        if (document.querySelector('#mainnav') && document.querySelector('#mainnav').classList.contains('fixed-pinned') || adHidden || !ad || !ad.children.length) {
            if (document.querySelector('.index .store-header')) document.querySelector('.index .store-header').style.top = '';
            ['#mobile-menu-overlay'].forEach(function(s) {
                var el = document.querySelector(s);
                if (el) el.style.marginTop = '';
            });
        } else if (ad) {
            const h = ad.children.length * 46;
            if (document.querySelector('.index .store-header')) document.querySelector('.index .store-header').style.top = h + 'px';
            [ '#mobile-menu-overlay'].forEach(function(s) {
                var el = document.querySelector(s);
                if (el) el.style.marginTop = h + 'px';
            });
        }
    }
    
    const ad = document.querySelector('salla-advertisement');
    if (!ad) return { disconnect: function() {} };
    
    const observers = [];
    
    // Watch ad
    const adObserver = new MutationObserver(adjust);
    adObserver.observe(ad, { 
        childList: true, 
        attributes: true,
        attributeFilter: ['style'] 
    });
    observers.push(adObserver);
    
    // Watch mainnav
    const mainnav = document.querySelector('#mainnav');
    if (mainnav) {
        const mainnavObserver = new MutationObserver(adjust);
        mainnavObserver.observe(mainnav, { 
            attributes: true, 
            attributeFilter: ['class'] 
        });
        observers.push(mainnavObserver);
    }
    
    window.addEventListener('resize', adjust);
    adjust();
    
    return {
        disconnect: function() {
            for (var i = 0; i < observers.length; i++) {
                observers[i].disconnect();
            }
            window.removeEventListener('resize', adjust);
        }
    };
}
  initiateStickyMenu() {
    // Create and update CSS variable for scroll Y
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY || window.pageYOffset;
      document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);
    });

    // Set initial value
    document.documentElement.style.setProperty('--scroll-y', '0px');
    let header = this.element("#mainnav"),
    height = this.element("#mainnav .inner")?.clientHeight;
    // Declare magicMenu variable
    let mobileMenu = document.getElementById("mobile-menu-overlay");
    let magicMenu = document.getElementById("mega-content");
    let searchModal = document.getElementById("search-panel-wrapper");
    let simpleMenu = document.getElementById("simple-menu");

    //when it's landing page, there is no header
    if (!header) {
      return;
    }

    window.addEventListener("load", () =>
      setTimeout(() => this.setHeaderHeight(), 500)
    );
    window.addEventListener("resize", () => this.setHeaderHeight());

    window.addEventListener(
      "scroll",
      () => {
        window.scrollY >= 100
          ? header.classList.add("fixed-pinned")
          : header.classList.remove("fixed-pinned");
        window.scrollY >= 1
          ? header.classList.add("fixed-header")
          : header.classList.remove("fixed-header");

        // Add scrolled class to magicMenu when scrolling
        function toggleScrollClass(element) {
          if (window.scrollY >= 100) {
              element.classList.replace("not-scrolled", "scrolled");
          } else {
              element.classList.replace("scrolled", "not-scrolled");
          }
      }

      if (magicMenu) toggleScrollClass(magicMenu);
      if (mobileMenu) toggleScrollClass(mobileMenu);
      if (searchModal) toggleScrollClass(searchModal);
      if (simpleMenu) toggleScrollClass(simpleMenu);
      },
      { passive: true }
    );
  }

  setHeaderHeight() {
    let height = this.element("#mainnav .inner").clientHeight,
      header = this.element("#mainnav");
    header.style.height = height + "px";
  }

  initiateDropdowns() {
    this.onClick(".dropdown__trigger", ({ target: btn }) => {
      btn.parentElement.classList.toggle("is-opened");
      document.body.classList.toggle("dropdown--is-opened");
      // Click Outside || Click on close btn
      window.addEventListener("click", ({ target: element }) => {
        if (
          (!element.closest(".dropdown__menu") && element !== btn) ||
          element.classList.contains("dropdown__close")
        ) {
          btn.parentElement.classList.remove("is-opened");
          document.body.classList.remove("dropdown--is-opened");
        }
      });
    });
  }
   openNewsletterModal() {
  // منع فتح أكتر من مودال
  if (document.getElementById("newsletter_sp-modal")) return;

  const lang = document.documentElement.lang || "ar";
  const getMessage = (key) => {
    const messages = {
      ar: {
        placeholder: "أدخل بريدك الإلكتروني",
        button: "إرسال",
        cancel: "إلغاء",
        email: "البريد الإلكتروني",
        invalid: "صيغة البريد الإلكتروني غير صحيحة",
        sent: "تم إرسال طلبك. شكراً لك",
        unavailable: "الخدمة غير متاحة حالياً",
      },
      en: {
        placeholder: "Enter your email address",
        button: "Send",
        cancel: "Cancel",
        email: "Email",
        invalid: "Invalid email format",
        sent: "Your request has been sent. Thank you",
        unavailable: "This service is currently unavailable",
      },
    };
    return messages[lang][key];
  };

  const modal = document.createElement("div");
  modal.id = "newsletter_sp-modal";
  modal.className = `
    fixed inset-0 z-[99] flex items-center justify-center
    bg-black/40 backdrop-blur-sm opacity-0
    transition-all duration-500
  `;

  modal.innerHTML = `
    <div class="newsletter-modal bg-background rounded-[10px] p-6 w-[90%] max-w-[580px]
                relative transform scale-90 transition-transform duration-500 shadow-xl">

      <button id="close-modal"
        class="absolute top-3 right-3 w-[24px] h-[24px] text-[#71717B]">
        <i class="sicon-cancel text-[16px]"></i>
      </button>
 <div class="w-[70px] h-[70px] mx-auto">
        <img src="${window.add_image}" alt="" class="w-full h-auto"/>
      </div>
      <div class="text-center mb-6">
        <h2 class="text-primary font-semibold text-lg">
          ${window.newsletter_sp_block_title || ""}
        </h2>
        <p class="text-[#71717B] text-sm">
          ${window.newsletter_sp_sub_title || ""}
        </p>
      </div>

      <form id="newsletter-form"
        action="${window.newsletter_sp_url || "#"}"
        method="post"
        target="_blank"
        novalidate>

        <label class="block mb-2 text-primary font-semibold">
          ${getMessage("email")}
        </label>

        <input
          type="email"
          name="EMAIL"
          placeholder="${getMessage("placeholder")}"
          class="w-full px-4 py-3 mb-6 rounded-[10px]
                 bg-gray-100 focus:outline-none
                 focus:ring-2 focus:ring-primary/40"
          required
        />

        <div class="flex gap-3">
          <button type="submit"
            class="w-1/2 bg-primary text-background py-3 rounded-[4px]
                   hover:scale-105 active:scale-95 transition">
            ${getMessage("button")}
          </button>

          <button type="button" id="cancel-modal"
            class="w-1/2 border border-primary text-primary py-3 rounded-[4px]
                   hover:scale-105 active:scale-95 transition">
            ${getMessage("cancel")}
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  requestAnimationFrame(() => {
    modal.classList.remove("opacity-0");
    modal.querySelector(".newsletter-modal").classList.remove("scale-90");
  });

  // ===============================
  // Close modal
  // ===============================
  const closeModal = () => {
    modal.classList.add("opacity-0");
    modal.querySelector(".newsletter-modal").classList.add("scale-90");
    setTimeout(() => modal.remove(), 400);
  };

  modal.querySelector("#close-modal").onclick = closeModal;
  modal.querySelector("#cancel-modal").onclick = closeModal;

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // ===============================
  // Handle form
  // ===============================
  const form = modal.querySelector("#newsletter-form");
  const emailInput = form.querySelector("input");
  const submitBtn = form.querySelector("button[type='submit']");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Never submit (or report success) when no real URL is configured
    if (!isUsableSubscriptionUrl(form.getAttribute("action"))) {
      console.warn("Newsletter: no valid subscription URL is configured, the form was not submitted.");
      salla.notify.error(getMessage("unavailable"));
      return;
    }

    const email = emailInput.value.trim();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!regex.test(email)) {
      salla.notify.error(getMessage("invalid"));
      return;
    }

    submitBtn.disabled = true;

    fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      mode: "no-cors",
    })
      .then(() => {
        // no-cors replies are opaque, so only confirm that the request was sent
        salla.notify.info(getMessage("sent"));
        closeModal();
      })
      .catch(() => {
        salla.notify.error(getMessage("unavailable"));
      })
      .finally(() => {
        submitBtn.disabled = false;
      });
  });
}

// ===============================
// Attach to notify button
// ===============================


  async init_SideCart() {
    if (window.location.pathname.includes("/cart")) {
      // إذا كنا في صفحة الكارت، لا نحتاج للسايد كارت
      return;
    }
    const cartBtn = document.querySelectorAll(".sidecart-button");
    const cartPanel = document.querySelector("#sidecart-panel");
    const overlay = document.querySelector("#sidecart-overlay");
    const closeBtns = cartPanel.querySelectorAll(
      ".menu-close, .close-side-panel"
    );
    const content = cartPanel.querySelector(".side-panel__content");
    const itemsWrap = cartPanel.querySelector("#sidecart-items");
    const total = cartPanel.querySelector("#sidecart-total");
    const subTotal = cartPanel.querySelector("#sidecart-subtotal");
    const totalDiscount = cartPanel.querySelector("#sidecart-total-discount");
    const count = cartPanel.querySelector(".sidecart-products-count");
    const totalItemsEl = document.querySelectorAll(".cart-total-items");
    const isRtl =
      document.documentElement.dir === "rtl" || document.body.dir === "rtl";
    const offscreenX = isRtl ? "100%" : "-100%";
    cartPanel.style.transform = `translateX(${offscreenX})`;
    cartPanel.style.visibility = "hidden";
    cartPanel.style.pointerEvents = "none";
    content.style.opacity = "0";

    // ⚙️ عرض وإخفاء السايد كارت
    const toggleCart = (show) => {
      if (show) {
        cartPanel.style.visibility = "visible";
        cartPanel.style.pointerEvents = "auto";
        overlay.classList.remove("hidden");
        requestAnimationFrame(() => overlay.classList.add("opacity-100"));

        requestAnimationFrame(() => {
          cartPanel.style.transform = "translateX(0)";
          content.style.opacity = "1";
          content.style.transform = "translateX(0)";
        });
      } else {
        overlay.classList.remove("opacity-100");
        setTimeout(() => overlay.classList.add("hidden"), 300);
        const outX = isRtl ? "100%" : "-100%";
        cartPanel.style.transform = `translateX(${outX})`;
        content.style.opacity = "0";
        cartPanel.style.pointerEvents = "none";
        setTimeout(() => (cartPanel.style.visibility = "hidden"), 300);
      }
    };
    const productCache = {};

    async function fetchProductDetails(productId) {
      if (!productCache[productId]) {
        const res = await salla.product.getDetails(productId, [
          "images",
          "options",
        ]);
        productCache[productId] = res.data;
      }
      return productCache[productId];
    }
    // 📦 تحميل السلة
    function buildHiddenOptionsInputs(productDetails) {
      if (!productDetails?.options?.length) return "";

      return productDetails.options
        .map((option) => {
          const firstValue = option.details?.[0];
          if (!firstValue) return "";

          return `
        <input 
          type="hidden" 
          name="options[${option.id}]" 
          value="${firstValue.id}"
        >
      `;
        })
        .join("");
    }

    async function loadCart() {
      function getLocalizedMessageinner(key) {
        const lang = document.documentElement.lang || "ar";
        const messages = {
          ar: {
            remove: "إزالة",
            quantity: "الكمية",
            tax_included: "الضريبة مشمولة",
          },
          en: {
            remove: "Remove",
            quantity: "Quantity",
            tax_included: "Tax Included",
          },
        };
        return messages[lang]?.[key] || messages["ar"][key] || key;
      }
      try {
        const res = await salla.api.cart.details();
        const cart = res.data.cart || {
          items: [],
          count: 0,
          total: 0,
          sub_total: 0,
        };
        const items = cart.items;
        const itemsWithDetails = await Promise.all(
          items.map(async (item) => {
            const details = await fetchProductDetails(item.product_id);
            const hiddenOptions = buildHiddenOptionsInputs(item.details);

            return { ...item, details };
          })
        );

        const totalItems = items.length;
        totalItemsEl.forEach((totalel) => {
          totalel.textContent = `${totalItems}`;
        });
        if (cart.items && cart.items.length) {

          function updateCartCount(count, lang) {
            if (lang === "ar") {
              return `(${count} ${document.documentElement.lang == "ar" ? "منتج":"products"})`;
            } else {
              return `(${count} item${count !== 1 ? "s" : ""})`;
            }
          }
          const currentLang = document.documentElement.lang || 'ar';
          count.textContent = updateCartCount(cart.count, currentLang);

          itemsWrap.innerHTML = itemsWithDetails
            .map((item) => {
              const hiddenOptions = buildHiddenOptionsInputs(item.details);

              const item_url =
                item.product_url || salla.url.get("*/p" + item.product_id);

              const img =
                item.product_image ||
                "https://cdn.salla.sa/form-builder/l48OVh1I5UsWqxsN8cNwutoWTK8OS4r1iUVjYD3B.webp";

              return `

      <form onchange="salla.form.onChange('cart.updateItem', event)"
            id="item-${item.id}" novalidate>

        <input type="hidden" name="id" value="${item.id}">
        ${hiddenOptions}

        <section class="cart-item bg-[#fff] p-2  mb-4"
                 data-id="${item.id}">

          <div class="grid grid-cols-[96px_1fr] gap-3 items-start">
  
  <!-- IMAGE -->
  <a href="${item_url}" class="w-24 h-24 row-span-2">
    <img src="${img}" 
         alt="${item.product_name}"
         class="w-full h-full object-cover" />
  </a>

  <!-- TOP ROW: name + delete -->
  <div class="flex justify-between items-start gap-2">
    <a href="${item_url}" class="text-sm font-medium line-clamp-2">
      ${item.product_name}
    </a>

    <button type="button"
            class="delete-btn text-gray-500 hover:text-red-500"
            data-item-id="${item.id}">
      <i class="sicon-trash-2"></i>
    </button>
  </div>

  <!-- BOTTOM ROW: price + qty -->
  <div class="flex justify-between items-center">
    
    <!-- PRICE -->
    <div class="flex items-center gap-2">
      <span class="font-medium">
        ${salla.money(item.price)}
      </span>

      ${
        item.original_price > item.price
          ? `<span class="line-through text-[#9F9FA9]">
               ${salla.money(item.original_price)}
             </span>`
          : ''
      }

      ${
        item.promotion_title
          ? `<span class="text-[#E7000B]">
               ${item.promotion_title}
             </span>`
          : ''
      }
    </div>

    <!-- QTY -->
    <salla-quantity-input
      cart-item-id="${item.id}"
      max="500"
      value="${item.quantity}"
      name="quantity">
    </salla-quantity-input>

  </div>

</div>
        </section>
      </form>
    `;
            })
            .join("");

          total.innerHTML = salla.money(cart.total);
          subTotal.innerHTML = cart.sub_total
            ? salla.money(cart.sub_total)
            : "";
          totalDiscount.innerHTML = cart.total_discount
            ? salla.money(cart.total_discount)
            : salla.money(0);

          // 🗑️ زر الحذف
          itemsWrap.querySelectorAll(".delete-btn").forEach((btn) => {
            btn.addEventListener("click", async () => {
              const id = btn.dataset.itemId;
              await salla.cart.deleteItem(id);
              await loadCart(); // تحديث المحتوى
            });
          });
        } else {
          itemsWrap.innerHTML = `
                  <div class="text-center py-10 text-gray-500">
                    <i class="sicon-shopping-bag text-3xl mb-2 block"></i>
                    <p>${salla.lang.get("pages.cart.empty_cart")}</p>
                  </div>`;
          total.innerHTML = "";
          subTotal.innerHTML = "";
          totalDiscount.innerHTML = "";
          count.textContent = "";
          totalItemsEl.forEach((totalel) => {
            totalel.textContent = `0`;
          });
        }
      } catch (err) {
        console.error("❌ Cart fetch error:", err);
        itemsWrap.innerHTML = `<div class="p-4 text-sm text-red-500">${document.documentElement.lang== ar ? 'حدث خطأ في تحميل السلة' :"Something went wrong"}</div>`;
      }
    }

    // 📢 ربط الأحداث
    salla.event.cart.onUpdated(loadCart);
    salla.event.cart.onItemAdded(async () => {
      await loadCart();
      toggleCart(true);
    });
    salla.event.cart.onItemDeleted(loadCart);
    document.addEventListener("salla:cart:updated", loadCart);

    // تحميل أول مرة
    await loadCart();

    // فتح / غلق السايد كارت

    cartBtn.forEach(btn=>{
      btn.addEventListener("click", () => {
      const isVisible = cartPanel.style.visibility === "visible";
      toggleCart(!isVisible);
    });
    })
    
    closeBtns.forEach((btn) =>
      btn.addEventListener("click", () => toggleCart(false))
    );
    overlay?.addEventListener("click", () => toggleCart(false));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") toggleCart(false);
    });
  }
async initSideCartCoupon() {
  const input = document.querySelector("#coupon-input-sidecart");
  const btn = document.querySelector("#coupon-btn-sidecart");
  const error = document.querySelector("#coupon-error-sidecart");

  if (!input || !btn || !error) return;

  const clearError = () => {
    error.innerText = "";
    input.classList.remove("has-error");
  };

  const applyToggle = (applied, couponCode = "") => {
    input.value = applied ? couponCode : "";
    input.toggleAttribute("disabled", applied);
    input.classList.remove("has-error");

    btn.classList.toggle("btn--danger", applied);
    btn.classList.toggle("btn--default", !applied);

    const span = btn.querySelector("span.coupon-text");
    const icon = btn.querySelector("i.sicon-cancel");
    if (span && icon) {
      span.style.display = applied ? "none" : "inline-block";
      icon.style.display = applied ? "inline-block" : "none";
    }
  };

  // 🔹 عند التحميل الأول، مزامنة الكوبون مع الكارت
  try {
    const res = await salla.api.cart.details();
    const cart = res.data.cart;
    if (cart?.coupon) {
      applyToggle(true, cart.coupon);
    }
  } catch (err) {
    console.error("❌ Failed to fetch cart for sidecart coupon", err);
  }

  // 🔹 حدث الضغط على زر الكوبون
  btn.addEventListener("click", async () => {
    const applied = btn.classList.contains("btn--danger");

    if (!applied && !input.value.trim()) {
      error.innerText = `${document.documentElement.lang == "ar" ? "الرجاء إدخال كود الكوبون":"Please Add Copoun"}`;
      input.classList.add("has-error");
      return;
    }

    try {
      btn.disabled = true;
      if (applied) {
        await salla.cart.deleteCoupon();
        applyToggle(false);
      } else {
        await salla.cart.addCoupon(input.value.trim());
        applyToggle(true, input.value.trim());
      }
    } catch (err) {
      error.innerText =
        err.response?.data?.error?.message || "حدث خطأ في تطبيق الكوبون";
      input.classList.add("has-error");
    } finally {
      btn.disabled = false;
    }
  });

  // 🔹 الضغط على Enter
  input.addEventListener("keyup", (e) => {
    if (e.key === "Enter") btn.click();
    clearError();
  });

  // 🔹 مزامنة الكوبون عند أي تحديث للكارت
  salla.event.cart.onUpdated(async (data) => {
    const couponCode = data.coupon || "";
    applyToggle(!!couponCode, couponCode);
  });
}

  initiateModals() {
    this.onClick("[data-modal-trigger]", (e) => {
      let id = "#" + e.target.dataset.modalTrigger;
      this.removeClass(id, "hidden");
      setTimeout(() => this.toggleModal(id, true)); //small amont of time to running toggle After adding hidden
    });
    salla.event.document.onClick("[data-close-modal]", (e) =>
      this.toggleModal("#" + e.target.dataset.closeModal, false)
    );
  }

  toggleModal(id, isOpen) {
    this.toggleClassIf(
      `${id} .s-salla-modal-overlay`,
      "ease-out duration-300 opacity-100",
      "opacity-0",
      () => isOpen
    )
      .toggleClassIf(
        `${id} .s-salla-modal-body`,
        "ease-out duration-300 opacity-100 translate-y-0 sm:scale-100", //add these classes
        "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95", //remove these classes
        () => isOpen
      )
      .toggleElementClassIf(
        document.body,
        "modal-is-open",
        "modal-is-closed",
        () => isOpen
      );
    if (!isOpen) {
      setTimeout(() => this.addClass(id, "hidden"), 350);
    }
  }

  initiateCollapse() {
    document.querySelectorAll(".btn--collapse").forEach((trigger) => {
      const content = document.querySelector("#" + trigger.dataset.show);
      const state = { isOpen: false };

      const onOpen = () =>
        anime({
          targets: content,
          duration: 225,
          height: content.scrollHeight,
          opacity: [0, 1],
          easing: "easeOutQuart",
        });

      const onClose = () =>
        anime({
          targets: content,
          duration: 225,
          height: 0,
          opacity: [1, 0],
          easing: "easeOutQuart",
        });

      const toggleState = (isOpen) => {
        state.isOpen = !isOpen;
        this.toggleElementClassIf(
          [content, trigger],
          "is-closed",
          "is-opened",
          () => isOpen
        );
      };

      trigger.addEventListener("click", () => {
        const { isOpen } = state;
        toggleState(isOpen);
        isOpen ? onClose() : onOpen();
      });
    });
  }
  initSizeOptionSingle() {
    // Find all containers with the exact data-option-type we want
    const containers = document.querySelectorAll(
      '.product-single .s-product-options-wrapper [data-option-type="single-option"]'
    );

    if (!containers.length) {
      console.warn("No container with data-option-type='single-option' found.");
      return;
    }

    containers.forEach((container) => {
      const select = container.querySelector("select");

      if (!select) {
        console.warn("No <select> found inside single-option container.");
        return;
      }

      const options = Array.from(select.options).filter(
        (opt) => opt.value.trim() !== ""
      );
      const radioContainer = document.createElement("div");
      radioContainer.classList.add("custom-radio-options");

      const radioButtons = [];

      options.forEach((option) => {
        const id = `option_${option.value}`;

        const label = document.createElement("label");
        label.setAttribute("for", id);
        label.classList.add("radio-label");
        label.style.display = "block";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = select.name;
        radio.value = option.value;
        radio.id = id;
        radio.required = select.required;
        radio.classList.add("sr-only");

        label.appendChild(radio);
        label.append(` ${option.text}`);
        radioContainer.appendChild(label);

        radioButtons.push({ radio, label });

        radio.addEventListener("change", () => {
          radioButtons.forEach(({ label: lbl }) =>
            lbl.classList.remove("label_active")
          );
          label.classList.add("label_active");
        });
      });

      select.parentNode.replaceChild(radioContainer, select);
    });
  }
  observeSizeOptionSingle() {
    const target = document.querySelector("salla-product-options");
    if (!target) {
      console.warn("No <salla-product-options> element found.");
      return;
    }

    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          if (target.classList.contains("hydrated")) {
            observer.disconnect(); // stop observing
            this.initSizeOptionSingle(); // run after hydration
          }
        }
      }
    });

    observer.observe(target, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // If already hydrated, trigger immediately
    if (target.classList.contains("hydrated")) {
      this.initSizeOptionSingle();
      observer.disconnect();
    }
  }
  initHideEndedCountDown() {
    customElements.whenDefined("salla-count-down").then(() => {
      requestAnimationFrame(() => {
        const countDowns = document.querySelectorAll("section");

        countDowns.forEach((countDown) => {
          const observer = new MutationObserver(() => {
            const item = countDown.querySelector("salla-count-down");
            const endedText = item?.querySelector(".s-count-down-end-text");

            if (endedText) {
              item.style.display = "none";
              observer.disconnect();
            }
          });

          observer.observe(countDown, { childList: true, subtree: true });
        });
      });
    });
  }

  /**
   * Workaround for seeking to simplify & clean, There are three ways to use this method:
   * 1- direct call: `this.anime('.my-selector')` - will use default values
   * 2- direct call with overriding defaults: `this.anime('.my-selector', {duration:3000})`
   * 3- return object to play it letter: `this.anime('.my-selector', false).duration(3000).play()` - will not play animation unless calling play method.
   * @param {string|HTMLElement} selector
   * @param {object|undefined|null|null} options - in case there is need to set attributes one by one set it `false`;
   * @return {Anime|*}
   */
  anime(selector, options = null) {
    let anime = new Anime(selector, options);
    return options === false ? anime : anime.play();
  }

  /**
   * These actions are responsible for pressing "add to cart" button,
   * they can be from any page, especially when mega-menu is enabled
   */
  initAddToCart() {
    salla.cart.event.onUpdated((summary) => {
      document
        .querySelectorAll("[data-cart-total]")
        .forEach((el) => (el.innerHTML = salla.money(summary.total)));
      document
        .querySelectorAll("[data-cart-count]")
        .forEach((el) => (el.innerText = salla.helpers.number(summary.count)));
    });

    salla.cart.event.onItemAdded((response, prodId) => {
      app
        .element("salla-cart-summary")
        .animateToCart(app.element(`#product-${prodId} img`));
    });
  }
}

salla.onReady(() => new App().loadTheApp());
