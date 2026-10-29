import "lite-youtube-embed";
import BasePage from "./base-page";
import Fslightbox from "fslightbox";
window.fslightbox = Fslightbox;
import { zoom } from "./partials/image-zoom";

class Product extends BasePage {
  onReady() {
    app.watchElements({
      totalPrice: ".total-price",
      productWeight: ".product-weight",
      beforePrice: ".before-price",
      startingPriceTitle: ".starting-price-title",
    });

    this.initProductOptionValidations();

    if (imageZoom) {
      // call the function when the page is ready
      this.initImagesZooming();
      // listen to screen resizing
      window.addEventListener("resize", () => this.initImagesZooming());
    }
    this.initproductdetailsFaqs();
    this.initGalleryReducedMotion();
    this.runningAfter5Seconds();
    this.collections_offer();
  }

  initproductdetailsFaqs() {
    document.addEventListener("DOMContentLoaded", () => {
      const metadata = document.querySelector("salla-metadata");
      if (!metadata) {
        console.error("❌ <salla-metadata> not found!");
        return;
      }

      function initFaqAccordion() {
        const rows = metadata.querySelectorAll(".s-metadata-row");
        if (!rows.length) {
          console.warn("⚠️ No FAQ rows inside <salla-metadata>");
          return;
        }

        rows.forEach((row) => {
          const title = row.querySelector(".s-metadata-row-name");
          const value = row.querySelector(".s-metadata-row-value");
          if (!title || !value) return;

          if (title.dataset.bound) return;
          title.dataset.bound = "true";

          title.addEventListener("click", () => {
            if (row.classList.contains("open")) {
              value.style.maxHeight = value.scrollHeight + "px";
              requestAnimationFrame(() => {
                value.style.maxHeight = "0";
              });
              row.classList.remove("open");
              value.classList.remove("open");
            } else {
              value.style.maxHeight = value.scrollHeight + "px";
              row.classList.add("open");
              value.classList.add("open");

              value.addEventListener(
                "transitionend",
                () => {
                  if (row.classList.contains("open")) {
                    value.style.maxHeight = "none";
                  }
                },
                { once: true }
              );
            }
          });
        });
      }

      if (metadata.classList.contains("hydrated")) {
        initFaqAccordion();
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "class" &&
            metadata.classList.contains("hydrated")
          ) {
            initFaqAccordion();
            obs.disconnect();
          }
        });
      });
      observer.observe(metadata, { attributes: true });
    });
  }
  getLocalizedMessage(key) {
    const lang = document.documentElement.lang || "ar";
    const messages = {
      ar: {
        placeholder: "أدخل بريدك الإلكتروني",
        button: "إرسال",
        cancel: "إلغاء",
        email: "البريد الإلكتروني",
        dont_remind_me_again: "لا تُذكرني مرة أخرى",
        close: "إغلاق",
        notify_dialog: "إشعار عند توفر المنتج",
        offer_dialog: "عرض خاص"
      },
      en: {
        placeholder: "Enter your email address",
        button: "Send",
        cancel: "Cancel",
        email: "Email",
        dont_remind_me_again: "Don’t remind me again",
        close: "Close",
        notify_dialog: "Notify me when available",
        offer_dialog: "Special offer"
      },
    };
    return messages[lang][key];
  }

  /**
   * Dialog behavior shared by the popups created in this file (they are plain divs, so nothing manages them for the visitor):
   * dialog semantics and name, focus moved inside, Tab kept inside (Shift+Tab too), Escape to close, focus returned on close.
   * One keydown listener lives only while the dialog is open, and only the topmost open dialog reacts when several are open.
   * @returns {Function} release - call it when the dialog closes (safe to call more than once)
   */
  openAccessibleDialog(modal, { titleId, descriptionId, fallbackLabel, initialFocus, requestClose }) {
    const opener = document.activeElement;
    const stack = (Product.openDialogs = Product.openDialogs || []);

    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    // The title is merchant text and can be empty: then fall back to a translated name
    if (document.getElementById(titleId)?.textContent.trim()) {
      modal.setAttribute("aria-labelledby", titleId);
    } else {
      modal.setAttribute("aria-label", fallbackLabel);
    }
    if (descriptionId && document.getElementById(descriptionId)?.textContent.trim()) {
      modal.setAttribute("aria-describedby", descriptionId);
    }

    const getFocusable = () =>
      Array.from(
        modal.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.getClientRects().length > 0);

    const onKeydown = (e) => {
      if (stack[stack.length - 1] !== modal) return;

      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
        return;
      }
      if (e.key !== "Tab") return;

      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (!modal.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    stack.push(modal);
    document.addEventListener("keydown", onKeydown);
    (modal.querySelector(initialFocus) || getFocusable()[0])?.focus({ preventScroll: true });

    let released = false;
    return () => {
      if (released) return;
      released = true;
      document.removeEventListener("keydown", onKeydown);
      const index = stack.indexOf(modal);
      if (index !== -1) stack.splice(index, 1);
      // Give the focus back to what had it before, if it is still on the page
      if (opener && opener !== document.body && document.contains(opener)) {
        opener.focus({ preventScroll: true });
      }
    };
  }
  runningAfter5Seconds() {
    

    // Only out-of-stock products get the popup, and only when the merchant enabled it
    // and set a real subscription URL (the editor default is not one)
    const isOutOfStock = ["out", "out-and-notify"].includes(window.status_product);
    const isPopupEnabled = !["", "0", "false"].includes(String(window.newsletter_sp_view_modal));
    if (
      !isOutOfStock ||
      !isPopupEnabled ||
      !window.isUsableSubscriptionUrl?.(window.newsletter_sp_url)
    ) {
      return;
    }

    setTimeout(() => {
      // show modal after delay

      const modal = document.createElement("div");
      modal.id = "newsletter_sp-modal";
      modal.className = `
      fixed inset-0 z-[99] flex items-center justify-center 
      bg-black/40 backdrop-blur-sm opacity-0 
      transition-all duration-500
    `;

      modal.innerHTML = `
      <div class="bg-background  rounded-[10px] p-6 w-[90%] max-w-[580px] mb-4 relative transform scale-90 transition-transform duration-500 shadow-xl">
      <div class="w-[70px] h-[70px] mx-auto">
        <img src="${add_image}" alt="" class="w-full h-auto"/>
      </div>
        <button id="close-modal" type="button" aria-label="${this.getLocalizedMessage("close")}" 
          class="absolute top-3 flex items-center justify-center right-3 font-bold w-[24px] h-[24px]  text-[#71717B] transition">
          <i class="sicon-cancel text-[16px] font-bold" aria-hidden="true"></i>
        </button>

        <div class="text-center">
          <h2 id="newsletter_sp-title" class="text-primary mb-1 font-semibold text-lg leading-7 tracking-normal text-center align-middle">${newsletter_sp_block_title}</h2>
          <p id="newsletter_sp-description" class="text-[#71717B] font-medium text-sm leading-5 tracking-wide text-center align-middle">${newsletter_sp_sub_title}</p>
        </div>

        <form 
          action="${newsletter_sp_url}" 
          method="post"
          id="mc-embedded-subscribe-form-1"
          class="flex flex-col items-center justify-center gap-2 rounded-[10px] p-1 w-full mx-auto"
          target="_blank"
          novalidate
        >
        <div class="my-8 w-full">
        <label for="mce-EMAIL-1" class="text-primary mb-1 font-semibold text-lg leading-7 tracking-normal text-center align-middle">${this.getLocalizedMessage(
          "email"
        )}</label>
          <input
            type="email"
            name="EMAIL"
            id="mce-EMAIL-1"
            placeholder="${this.getLocalizedMessage("placeholder")}"
            class="flex-1 bg-gray-100 w-full px-4 py-3 border-none  text-gray-700 placeholder-gray-400 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-primary/40"
            required
          />
          </div>
          <div class="flex gap-3 w-full">
          <button 
          type="submit"
          id="mc-embedded-subscribe-1"
          class="flex items-center justify-center rounded-[4px]   hover:scale-105 px-3 py-3 bg-primary text-background active:scale-95 transition-transform w-[50%]"
          >
          ${this.getLocalizedMessage("button")}
          </button>
          <button 
          type="button"
          id="cancel-modal"
          class="text-primary border border-primary bg-background rounded-[4px] flex items-center justify-center  hover:scale-105 px-3 py-3 active:scale-95 transition-transform w-[50%]"
          >
          ${this.getLocalizedMessage("cancel")}
          </button>
          </div>
        </form>
      </div>
    `;

      document.body.appendChild(modal);

      requestAnimationFrame(() => {
        modal.classList.remove("opacity-0");
        modal.querySelector("div").classList.remove("scale-90");
        modal.querySelector("div").classList.add("scale-100");
      });

      const releaseDialog = this.openAccessibleDialog(modal, {
        titleId: "newsletter_sp-title",
        descriptionId: "newsletter_sp-description",
        fallbackLabel: this.getLocalizedMessage("notify_dialog"),
        initialFocus: "#mce-EMAIL-1",
        requestClose: () => closeModal(),
      });

      const closeModal = () => {
        releaseDialog();
        modal.classList.add("opacity-0");
        modal.querySelector("div").classList.add("scale-90");
        setTimeout(() => modal.remove(), 400);
      };

      document
        .getElementById("close-modal")
        .addEventListener("click", closeModal);
      document
        .getElementById("cancel-modal")
        .addEventListener("click", closeModal);

      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });

      const form = document.getElementById("mc-embedded-subscribe-form-1");
      const emailInput = document.getElementById("mce-EMAIL-1");
      const submitBtn = document.getElementById("mc-embedded-subscribe-1");

      const isRTL = document.documentElement.dir === "rtl";
      const messages = {
        required: isRTL
          ? "الرجاء إدخال بريد إلكتروني صحيح"
          : "Please enter a valid email",
        invalid: isRTL
          ? "صيغة البريد الإلكتروني غير صحيحة"
          : "Invalid email format",
        // The request is sent in no-cors mode, so the reply cannot be read: only confirm that it was sent
        sent: isRTL
          ? "تم إرسال طلبك. شكراً لك"
          : "Your request has been sent. Thank you",
        unavailable: isRTL
          ? "الخدمة غير متاحة حالياً"
          : "This service is currently unavailable",
        sending: isRTL ? "جاري الإرسال..." : "Sending...",
      };

      form.addEventListener("submit", (e) => {
        e.preventDefault();

        // Never submit (or report success) when no real URL is configured
        if (!window.isUsableSubscriptionUrl?.(form.getAttribute("action"))) {
          console.warn("Newsletter: no valid subscription URL is configured, the form was not submitted.");
          salla.notify.error(messages.unavailable);
          return;
        }

        const emailValue = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(emailValue)) {
          salla.notify.error(messages.invalid);
          return;
        }

        submitBtn.disabled = true;

        fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          mode: "no-cors",
        })
          .then(() => {
            salla.notify.info(messages.sent);
            form.reset();
            closeModal();
          })
          .catch(() => {
            salla.notify.error(messages.unavailable);
          })
          .finally(() => {
            submitBtn.disabled = false;
          });
      });
    }, 2000);
  }
collections_offer() {
  const allowedCategories = window.collection_categories.value; // [1343313527]
  const productCategoryId = window.product_category_id; 

  // Check localStorage first (it can throw when the browser blocks site data: then the popup is simply shown)
  let dontRemind = null;
  try {
    dontRemind = localStorage.getItem("collection_sp_modal_dont_remind");
  } catch (error) {}
  if (dontRemind === "true") return; // Exit early

  // Check category
  if (!allowedCategories.includes(productCategoryId) || !window.collection_sp_view_modal) return;

  let modalShown = false; // Show modal only once

  const showModal = () => {
    if (modalShown) return;
    modalShown = true;

    const modal = document.createElement("div");
    modal.id = "collection_sp-modal";
    modal.className = `
      fixed inset-0 z-[99] flex items-center justify-center 
      bg-black/0 backdrop-blur-sm opacity-0 
      transition-all duration-500
    `;

    modal.innerHTML = `
      <div class="bg-background rounded-[10px] p-6 w-[90%] max-w-[580px] mb-4 relative transform scale-90 transition-transform duration-500 shadow-xl opacity-0">
        <div class="w-[70px] h-[70px] mx-auto">
          <img src="${collection_add_image}" alt="" class="w-full h-auto"/>
        </div>
        <button id="close-collection-modal" type="button" aria-label="${this.getLocalizedMessage("close")}" 
          class="absolute top-3 flex items-center justify-center right-3 font-bold w-[24px] h-[24px] text-[#71717B] transition">
          <i class="sicon-cancel text-[16px] font-bold" aria-hidden="true"></i>
        </button>

        <div class="text-center mt-2 mb-10">
          <h2 id="collection_sp-title" class="text-primary mb-1 font-semibold text-lg leading-7 tracking-normal text-center align-middle">${collection_sp_block_title}</h2>
          <p id="collection_sp-description" class="text-[#71717B] font-medium text-sm leading-5 tracking-wide text-center align-middle">${collection_sp_sub_title}</p>
        </div>

        <p class="text-[#52525C] font-medium text-sm leading-5 tracking-wide text-center align-middle mb-4">${collection_sp_promo_title}</p>

        <div class="min-w-[194px] py-6 max-w-[194px] flex flex-col items-center justify-center mx-auto mb-10 rounded-md border-[color-mix(in_srgb,var(--color-primary)_20%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_5%,transparent)] border">
          <div class="w-[32px] h-[32px] mx-auto mb-2">
            <img src="${collectionn_footer_image}" alt="" class="w-full h-auto"/>
          </div>
          <span class="font-normal text-sm leading-5 tracking-wide">"${window.collection_title}"</span>
        </div>

        <div class="flex items-center justify-start gap-2">
          <input type="checkbox" id="dont-remind-checkbox" class="w-4 h-4 text-primary bg-white border-gray-300 rounded focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]" />
          <label for="dont-remind-checkbox">${this.getLocalizedMessage("dont_remind_me_again")}</label>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Force reflow لتفعيل الانيميشن
    const modalContent = modal.querySelector("div");
    void modal.offsetWidth;

    // ابدأ الانيميشن للفتح
    modal.classList.remove("bg-black/0", "opacity-0");
    modal.classList.add("bg-black/40", "opacity-100");
    modalContent.classList.remove("scale-90", "opacity-0");
    modalContent.classList.add("scale-100", "opacity-100");

    const releaseDialog = this.openAccessibleDialog(modal, {
      titleId: "collection_sp-title",
      descriptionId: "collection_sp-description",
      fallbackLabel: this.getLocalizedMessage("offer_dialog"),
      initialFocus: "#close-collection-modal",
      requestClose: () => closeModal(),
    });

    const closeModal = () => {
      releaseDialog();
      const checkbox = document.getElementById("dont-remind-checkbox");
      if (checkbox.checked) {
        // A failing write must never keep the popup from closing
        try {
          localStorage.setItem("collection_sp_modal_dont_remind", "true");
        } catch (error) {}
      }

      modal.classList.remove("bg-black/40", "opacity-100");
      modal.classList.add("bg-black/0", "opacity-0");

      modalContent.classList.remove("scale-100", "opacity-100");
      modalContent.classList.add("scale-90", "opacity-0");

      setTimeout(() => modal.remove(), 400);
    };

    document.getElementById("close-collection-modal").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  };

  window.addEventListener("scroll", () => {
    if (window.scrollY >= 600) showModal();
  });
}




  // Autoplay is movement the visitor did not ask for: stop it when the system asks for reduced motion
  initGalleryReducedMotion() {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sliders = document.querySelectorAll(
      "salla-slider.details-slider, salla-slider.product-images-slider"
    );

    sliders.forEach(async (slider) => {
      await customElements.whenDefined("salla-slider");

      // The Swiper instance is created after the component loads, so wait for it (bounded)
      let sliderApi;
      for (let attempt = 0; attempt < 20 && !sliderApi; attempt++) {
        sliderApi = await slider.sliderInstance?.();
        sliderApi || (await new Promise((resolve) => setTimeout(resolve, 250)));
      }

      // Nothing to do when the slider has no autoplay (setting off or a single image)
      if (!sliderApi?.autoplay || !sliderApi.params.autoplay) return;

      const applyMotionPreference = () =>
        reducedMotion.matches ? sliderApi.autoplay.stop() : sliderApi.autoplay.start();
      applyMotionPreference();
      reducedMotion.addEventListener("change", applyMotionPreference);
    });
  }

  initProductOptionValidations() {
    document
      .querySelector(".product-form")
      ?.addEventListener("change", function () {
        this.reportValidity() && salla.product.getPrice(new FormData(this));
      });
  }

  initImagesZooming() {
    // skip if the screen is not desktop or if glass magnifier
    // is already crated for the image before
    const imageZoom = document.querySelector(
      ".image-slider .magnify-wrapper.swiper-slide-active .img-magnifier-glass"
    );
    if (window.innerWidth < 1024 || imageZoom) return;
    setTimeout(() => {
      // set delay after the resizing is done, start creating the glass
      // to create the glass in the proper position
      const image = document.querySelector(
        ".image-slider .swiper-slide-active img"
      );
      zoom(image?.id, 2);
    }, 250);

    document
      .querySelector("salla-slider.details-slider")
      .addEventListener("slideChange", (e) => {
        // set delay till the active class is ready
        setTimeout(() => {
          const imageZoom = document.querySelector(
            ".image-slider .swiper-slide-active .img-magnifier-glass"
          );

          // if the zoom glass is already created skip
          if (window.innerWidth < 1024 || imageZoom) return;
          const image = document.querySelector(
            ".image-slider .magnify-wrapper.swiper-slide-active img"
          );
          zoom(image?.id, 2);
        }, 250);
      });
  }

  registerEvents() {
    salla.event.on("product::price.updated.failed", () => {
      app.element(".price-wrapper").classList.add("hidden");
      app.element(".out-of-stock").classList.remove("hidden");
      app.anime(".out-of-stock", { scale: [0.88, 1] });
    });
    salla.product.event.onPriceUpdated((res) => {
      app.element(".out-of-stock").classList.add("hidden");
      app.element(".price-wrapper").classList.remove("hidden");

      let data = res.data,
        is_on_sale = data.has_sale_price && data.regular_price > data.price;

      app.startingPriceTitle?.classList.add("hidden");

      app.productWeight.forEach((el) => {
        el.innerHTML = data.weight || "";
      });
      app.totalPrice.forEach((el) => {
        el.innerHTML = salla.money(data.price);
      });
      app.beforePrice.forEach((el) => {
        el.innerHTML = salla.money(data.regular_price);
      });

      app.toggleClassIf(
        ".price_is_on_sale",
        "showed",
        "hidden",
        () => is_on_sale
      );
      app.toggleClassIf(
        ".starting-or-normal-price",
        "hidden",
        "showed",
        () => is_on_sale
      );

      app.anime(".total-price, .product-weight", { scale: [0.88, 1] });
    });

    app.onClick(
      "#btn-show-more",
      (e) =>
        app.all("#more-content", (div) => {
          e.target.classList.add("is-expanded");
          div.style = `max-height:${div.scrollHeight}px`;
        }) || e.target.remove()
    );
  }
}

Product.initiateWhenReady(["product.single"]);
