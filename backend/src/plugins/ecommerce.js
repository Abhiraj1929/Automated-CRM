// ============================================================
// E-commerce Plugin — Amazon Seller, Flipkart, Shopify
// ============================================================
const BasePlugin = require("./basePlugin");

class EcommercePlugin extends BasePlugin {
  constructor(config) {
    super({ ...config, type: "ecommerce" });
    this.platform = config.platform || "amazon";
  }

  canFetch() {
    switch (this.platform) {
      case "amazon":
        return !!(this.getCfg("sellerId") && this.getCfg("accessToken"));
      case "flipkart":
        return !!(this.getCfg("sellerId") && this.getCfg("apiKey"));
      case "shopify":
        return !!(this.getCfg("storeUrl") && this.getCfg("accessToken"));
      default:
        return false;
    }
  }

  async fetchLeads() {
    if (!this.canFetch()) return [];

    switch (this.platform) {
      case "amazon":
        return this.fetchAmazonLeads();
      case "flipkart":
        return this.fetchFlipkartLeads();
      case "shopify":
        return this.fetchShopifyLeads();
      default:
        return [];
    }
  }

  // ---- Amazon SP-API ----
  async fetchAmazonLeads() {
    const sellerId = this.getCfg("sellerId");
    const accessToken = this.getCfg("accessToken");
    const marketplace = this.getCfg("marketplace") || "A21TJRUUN4KGV"; // India
    const refreshToken = this.getCfg("refreshToken");

    try {
      const url = `https://sellingpartnerapi-na.amazon.com/orders/v0/orders?MarketplaceIds=${marketplace}&CreatedAfter=${this.getSinceDate()}&MaxResultsPerPage=50`;

      const response = await fetch(url, {
        headers: {
          "x-amz-access-token": accessToken,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        console.warn(`[Amazon] API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const orders = data.payload?.Orders || [];

      return orders.map((order) => this.normalizeAmazonOrder(order, sellerId));
    } catch (err) {
      console.warn(`[Amazon] Fetch failed:`, err.message);
      return [];
    }
  }

  normalizeAmazonOrder(order, sellerId) {
    const buyerEmail = order-buyerInfo?.buyerEmail || null;
    const buyerName = order.shippingAddress?.Name || "Amazon Customer";
    const phone = order.shippingAddress?.Phone || null;

    return {
      externalId: order.AmazonOrderId || null,
      name: buyerName,
      email: buyerEmail,
      phone: phone,
      source: "amazon",
      sourceUrl: `https://sellercentral.amazon.in/orders?orderIds=${order.AmazonOrderId}`,
      city: order.shippingAddress?.City || null,
      rawData: {
        orderId: order.AmazonOrderId,
        status: order.OrderStatus,
        totalAmount: order.OrderTotal?.Amount,
        currency: order.OrderTotal?.CurrencyCode,
        purchaseDate: order.PurchaseDate,
        itemCount: order.NumberOfItemsShipped + order.NumberOfItemsUnshipped,
        shippingAddress: order.shippingAddress,
      },
    };
  }

  // ---- Flipkart Seller API ----
  async fetchFlipkartLeads() {
    const sellerId = this.getCfg("sellerId");
    const apiKey = this.getCfg("apiKey");

    try {
      const sinceDate = this.getSinceDate();
      const url = `https://api.flipkart.net/api/v2/orders?fromDate=${sinceDate}&toDate=${new Date().toISOString().split("T")[0]}&status=SHIPPED,DELIVERED`;

      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-FLIPKART-SELLER-ID": sellerId,
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) return [];

      const data = await response.json();
      const orders = data.orders || data.content || [];

      return orders.map((order) => this.normalizeFlipkartOrder(order));
    } catch (err) {
      console.warn(`[Flipkart] Fetch failed:`, err.message);
      return [];
    }
  }

  normalizeFlipkartOrder(order) {
    return {
      externalId: order.orderId || order.id || null,
      name: order.deliveryAddress?.name || "Flipkart Customer",
      email: order.email || null,
      phone: order.deliveryAddress?.phone || null,
      source: "flipkart",
      sourceUrl: null,
      city: order.deliveryAddress?.city || null,
      rawData: {
        orderId: order.orderId,
        status: order.orderStatus,
        totalAmount: order.totalAmount,
        orderDate: order.orderDate,
      },
    };
  }

  // ---- Shopify Storefront API ----
  async fetchShopifyLeads() {
    const storeUrl = this.getCfg("storeUrl");
    const accessToken = this.getCfg("accessToken");

    try {
      const url = `${storeUrl}/admin/api/2024-01/orders.json?status=any&limit=50&created_at_min=${this.getSinceDate()}`;

      const response = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) return [];

      const data = await response.json();
      const orders = data.orders || [];

      return orders.map((order) => this.normalizeShopifyOrder(order));
    } catch (err) {
      console.warn(`[Shopify] Fetch failed:`, err.message);
      return [];
    }
  }

  normalizeShopifyOrder(order) {
    const customer = order.customer || {};
    const billing = order.billing_address || {};

    return {
      externalId: order.id?.toString() || null,
      name: customer.first_name ? `${customer.first_name} ${customer.last_name || ""}`.trim() : billing.name || "Shopify Customer",
      email: customer.email || order.email || null,
      phone: customer.phone || billing.phone || null,
      source: "shopify",
      sourceUrl: null,
      city: billing.city || null,
      rawData: {
        orderId: order.name,
        totalAmount: order.total_price,
        currency: order.currency,
        createdAt: order.created_at,
        lineItems: order.line_items?.length || 0,
      },
    };
  }

  getSinceDate() {
    const days = parseInt(this.getCfg("fetchDaysBack") || "7", 10);
    const since = new Date();
    since.setDate(since.getDate() - days);
    return since.toISOString();
  }

  normalize(rawItem) {
    return {
      first_name: rawItem.name?.split(" ")[0] || "Customer",
      last_name: rawItem.name?.split(" ").slice(1).join(" ") || "",
      email: rawItem.email || null,
      phone: rawItem.phone || null,
      source: rawItem.source || this.platform,
      source_url: rawItem.sourceUrl || null,
      status: "new",
      description: `${rawItem.rawData?.orderId || ""} — ${rawItem.source} order`,
      raw_data: rawItem.rawData || {},
      external_id: rawItem.externalId || null,
      imported_via: "api",
    };
  }
}

module.exports = EcommercePlugin;
