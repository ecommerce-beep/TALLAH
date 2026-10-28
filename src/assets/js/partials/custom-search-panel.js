// Wait until the document is fully loaded before executing the script
document.addEventListener('DOMContentLoaded', () => {
  
  // Declare DOM elements to be used in the search functionality
  const header = document.querySelector('.store-header');
  const siteHeader = document.querySelector('.site-header'); 
  const siteHeaderMobile = document.querySelector('.site-header-mobile'); 
  const overlayContainer = document.getElementById('search-overlay-container');
  const panel = document.getElementById('search-panel');
  const panelWrapper = document.getElementById('search-panel-wrapper');
  const toggleBtns = document.querySelectorAll('#search-toggle');
  const input = document.getElementById('custom-search-input');
  const resultsContainer = document.getElementById('custom-search-results');
  const resultsList = document.getElementById('custom-search-list');
  const noResults = document.getElementById('custom-no-results');
  
    function isHomePage() {
  return window.isHomePage === true;
}

  // Declare variables to manage search behavior
  let lastQuery = '';  // Store the last searched term to avoid duplicate requests
  let loading = false; // Flag to manage loading state
  let debounceTimer;   // Timer to manage debounced search input
  let activeIndex = -1; // Index of the suggestion highlighted with the keyboard (-1 means none)

  // Combobox/listbox semantics: the input keeps focus and exposes the highlighted suggestion via aria-activedescendant
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-haspopup', 'listbox');
  input.setAttribute('aria-controls', resultsList.id);
  input.setAttribute('aria-expanded', 'false');
  resultsList.setAttribute('role', 'listbox');
  if (input.placeholder) resultsList.setAttribute('aria-label', input.placeholder);

  /**
   * Function to get the suggestions currently rendered in the list
   */
  function getOptions() {
    return resultsList.querySelectorAll('[role="option"]');
  }

  /**
   * Function to highlight a suggestion and expose it to assistive technologies
   * @param {number} index - Index of the suggestion to highlight, or -1 to clear the highlight
   */
  function setActive(index) {
    const options = getOptions();

    options.forEach((option, i) => {
      const isActive = i === index;
      option.classList.toggle('bg-gray-100', isActive);
      option.setAttribute('aria-selected', String(isActive));
    });

    activeIndex = index;

    if (index >= 0 && options[index]) {
      input.setAttribute('aria-activedescendant', options[index].id);
      options[index].scrollIntoView({ block: 'nearest' }); // Keep the highlighted suggestion visible in the scrollable list
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  /**
   * Function to keep aria-expanded in sync with the visibility of the suggestions
   */
  function syncExpanded() {
    const expanded = !resultsContainer.classList.contains('hidden') && getOptions().length > 0;
    input.setAttribute('aria-expanded', String(expanded));
  }

  // Whenever the results are shown or hidden (typing, outside click, closing the panel), sync ARIA and drop the highlight
  new MutationObserver(() => {
    syncExpanded();
    if (resultsContainer.classList.contains('hidden')) setActive(-1);
  }).observe(resultsContainer, { attributes: true, attributeFilter: ['class'] });

  // Typing changes the query, so any previous highlight no longer applies
  input.addEventListener('input', () => setActive(-1));

  // Keyboard support: ArrowDown/ArrowUp move the highlight, Enter opens it, Escape closes the suggestions and then the panel
  input.addEventListener('keydown', (e) => {
    if (e.isComposing) return; // Do not interfere with text composition

    const options = getOptions();
    const resultsVisible = !resultsContainer.classList.contains('hidden');

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (!resultsVisible || options.length === 0) return;
        e.preventDefault(); // Keep the caret from jumping inside the input

        const step = e.key === 'ArrowDown' ? 1 : -1;
        // From "nothing highlighted", ArrowDown goes to the first suggestion and ArrowUp to the last one
        const next = activeIndex === -1
          ? (step === 1 ? 0 : options.length - 1)
          : (activeIndex + step + options.length) % options.length;
        setActive(next);
        break;
      }
      case 'Enter':
        // Only open a suggestion the user highlighted; never pick one automatically
        if (resultsVisible && options[activeIndex]) {
          e.preventDefault();
          options[activeIndex].querySelector('a')?.click(); // Same navigation as a mouse click
        }
        break;
      case 'Escape':
        if (resultsVisible) {
          resultsContainer.classList.add('hidden'); // First Escape only closes the suggestions
        } else {
          document.dispatchEvent(new CustomEvent('closeSearchPanel')); // Next Escape closes the whole panel
        }
        break;
    }
  });

  // Event listener for search input, implementing debounce to optimize API calls
  input.addEventListener('input', (e) => {
    const val = e.target.value.trim(); // Get the current value of the search input

    // Clear previous debounce timeout if any
    clearTimeout(debounceTimer);
    
    // Hide results if input is empty
    if (!val) {
      resultsContainer.classList.add('hidden');
      return;
    }

    // Set a debounce timeout to delay the search call
    debounceTimer = setTimeout(() => {
      search(val); // Call the search function after 100ms
    }, 100);
  });

  /**
   * Function to execute a search query and render results
   * @param {string} val - The search query term
   */
  function search(val) {
    // Prevent duplicate API requests only while the same query is loading or its results are still visible
    const resultsVisible = !resultsContainer.classList.contains('hidden');
    if (val === lastQuery && (loading || resultsVisible)) return;

    noResults.style.display = 'none'; // Hide no-results message initially
    loading = true; // Set loading state to true
    lastQuery = val;

    // Fetch the products using the search query
    salla.product.fetch({ source: "search", source_value: val })
      .then(response => {
        const products = response?.data ?? []; // Extract the product data from the response

        // If products are found, render them; otherwise, show 'No Results'
        if (products.length > 0) {
          renderResults(products);
        } else {
          showNoResults();
        }

        // Optional: Trigger an event for analytics or tracking purposes
        salla.event.emit('Products Searched', val);
      })
      .catch(err => {
        lastQuery = ''; // Allow the same query to be retried after a failed request

        // Handle errors other than duplicate query
        if (err !== 'Query is same as previous one!') {
          resultsList.innerHTML = '';  // Clear the results list
          showNoResults(); // Show no results message
        }
      })
      .finally(() => {
        loading = false; // Reset loading state
      });
  }

  /**
   * Function to build the price markup of a search suggestion
   * Follows the price logic used in product-card.js
   * @param {Object} product - Product returned by salla.product.fetch
   * @returns {string} - Price HTML, a dash, or an empty string when no valid price exists
   */
  function getPriceHtml(product) {
    const isValidPrice = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
    // Only validated numbers are passed to salla.money, never raw API text
    const format = (value) => salla.money(Number(value));

    if (product.is_on_sale) {
      // Fall back to the regular selling price when sale_price is missing
      const current = [product.sale_price, product.price].find(isValidPrice);

      if (current !== undefined) {
        // Show the original price struck through only when it is valid and higher
        const original = isValidPrice(product.regular_price) && Number(product.regular_price) > Number(current)
          ? `<span class="line-through ms-1">${format(product.regular_price)}</span>`
          : '';
        return `<span class="font-medium text-gray-900">${format(current)}</span>${original}`;
      }
    } else if (isValidPrice(product.starting_price)) {
      return `${salla.lang.get('pages.products.starting_price')} ${format(product.starting_price)}`;
    } else if (isValidPrice(product.price)) {
      return format(product.price);
    }

    // No usable price: follow the store's "show price as dash" setting
    return salla.config.get('store.settings.product.show_price_as_dash') ? '-' : '';
  }

  /**
   * Function to turn a product url into a link target, only http(s) urls are allowed
   * @param {string} url - Product url returned by the API
   * @returns {string} - Absolute url, or an empty string when the value is missing or not http(s)
   */
  function getSafeProductUrl(url) {
    try {
      const parsed = new URL(url, window.location.href);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
    } catch (error) {
      return '';
    }
  }

  // Pressing a suggestion must not move the focus out of the input (clicks and new tab opening still work)
  resultsList.addEventListener('mousedown', (e) => e.preventDefault());

  /**
   * Function to render search results in the UI
   * @param {Array} products - List of products to display
   */
  function renderResults(products) {
    resultsList.innerHTML = ''; // Clear any previous results

    // Loop through each product and create a list item
    products.forEach((product, index) => {
      const item = document.createElement('li');
      item.id = `custom-search-option-${index}`; // Referenced by aria-activedescendant
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
      item.className = 'hover:bg-gray-100';  // Apply styling (no cursor-pointer: the theme sets pointer-events:none on its children, which would disable the link)
      // The whole row is a real link (new tab, copy link...). It is not a tab stop: focus stays in the input
      item.innerHTML = `
        <a class="block px-4 py-2" tabindex="-1">
          <div class="flex gap-2 items-center space-x-4">
            <img src="${product.image.url}" alt="${product.name}" class="w-10 h-10 object-cover " />
            <div>
              <p class="text-sm font-medium">${product.name}</p>
              <p class="text-xs text-gray-500">${getPriceHtml(product)}</p>
            </div>
          </div>
        </a>
      `;
      const safeUrl = getSafeProductUrl(product.url);
      if (safeUrl) item.firstElementChild.href = safeUrl;
      resultsList.appendChild(item); // Append the item to the results list
    });

    resultsContainer.classList.remove('hidden'); // Show results container
    noResults.classList.add('hidden'); // Hide no results message
    setActive(-1); // New results start without a highlighted suggestion
    syncExpanded();
  }

  /**
   * Function to display the "No Results" message if no products are found
   */
  function showNoResults() {
    resultsList.innerHTML = ''; // Clear any previous results
    noResults.style.display = 'block'; // Show the "No Results" message
    resultsContainer.classList.remove('hidden'); // Ensure results container is visible
    setActive(-1);
    syncExpanded();
  }

  // Close the search dropdown when clicking outside of the results or input
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#custom-search-results') && !e.target.closest('#custom-search-input')) {
      resultsContainer.classList.add('hidden');
    }
  });

  // Handle trending keyword button clicks
  document.querySelectorAll('.trending-keyword-btn').forEach(button => {
    button.addEventListener('click', () => {
      const keyword = button.getAttribute('data-keyword');
      input.value = keyword; // Set the input value to the clicked keyword
      input.focus();  // Focus the input field
      search(keyword); // Trigger search immediately
    });
  });

  // Check for essential elements and return early if not found
  if (!overlayContainer || !panel || toggleBtns.length === 0) return;

  /**
   * Function to update the position of the search panel relative to the header
   */
  function updatePanelPosition() {
    if (header) {
      document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
    }
  }

  /**
   * Function to open the search panel with animations
   */
  function openSearchPanel() {
    // Close mobile menu before opening the search panel
    document.dispatchEvent(new CustomEvent("closeMobileMenu"));

    updatePanelPosition(); // Update the panel position based on the header
    overlayContainer.classList.remove('hidden');
    panelWrapper.classList.remove('overflow-hidden'); // Show the overlay container
    panelWrapper.classList.remove('pointer-events-none'); // Show the overlay container
    if (header) header.style.backgroundColor = window.header_bg_color; // Set the header background color
    if (siteHeader) siteHeader.style.color =  window.header_text_color;
    if (siteHeaderMobile) siteHeaderMobile.style.color = window.header_text_color;

    // Animation to slide the panel into view
    requestAnimationFrame(() => {
      panel.classList.remove('-translate-y-full');
      panel.classList.add('translate-y-0');
    });

    // Focus synchronously (inside the user's click) so mobile browsers can show the keyboard;
    // preventScroll avoids a page jump while the panel is still sliding in
    input.focus({ preventScroll: true });
  }

  /**
   * Function to close the search panel with animations
   */
  function closeSearchPanel() {
    input.blur(); // Drop the focus right away so the mobile keyboard closes with the panel
    panel.classList.add('-translate-y-full'); // Slide the panel out of view
    panel.classList.remove('translate-y-0');
    panelWrapper.classList.add('overflow-hidden'); // Show the overlay container
    panelWrapper.classList.add('pointer-events-none'); // Show the overlay container



    // Wait for the transition to finish, then hide the overlay and reset inputs
    panel.addEventListener('transitionend', () => {
      overlayContainer.classList.add('hidden');
      const searchInput = document.getElementById('custom-search-input');
      if (searchInput) searchInput.value = ''; // Clear the search input

      const resultsContainer = document.getElementById('custom-search-results');
      if (resultsContainer) resultsContainer.classList.add('hidden'); // Hide the results dropdown

      const noResults = document.getElementById('custom-no-results');
      if (noResults) noResults.style.display = 'none'; // Hide the "No Results" message

      const resultsList = document.getElementById('custom-search-list');
      if (resultsList) resultsList.innerHTML = ''; // Clear the results list

      if (header) header.style.backgroundColor = ''; // Reset the header background color
      if (siteHeader) siteHeader.style.color = isHomePage() ? "white" : window.header_text_color;
      if (siteHeaderMobile) siteHeaderMobile.style.color = isHomePage() ? "white" : window.header_text_color;
    }, { once: true });
  }

  /**
   * Function to check if the search panel is open
   * @returns {boolean} - Whether the panel is open or not
   */
  function isPanelOpen() {
    return panel.classList.contains('translate-y-0');
  }

  // Toggle the search panel on button click
  toggleBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event propagation to avoid closing the panel
      isPanelOpen() ? closeSearchPanel() : openSearchPanel(); // Toggle the panel
    });
  });

  // Close the search panel if the overlay is clicked
  overlayContainer.addEventListener('click', (e) => {
    if (!panel.contains(e.target)) {
      closeSearchPanel();
    }
  });

  // Listen for a custom event to close the search panel
  document.addEventListener("closeSearchPanel", () => {
    if (isPanelOpen()) {
      closeSearchPanel();
    }
  });

  // Update the panel position when the window is resized
  window.addEventListener('resize', updatePanelPosition);
});