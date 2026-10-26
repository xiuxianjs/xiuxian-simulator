//#region src/api/domains/market/operations.ts
const marketOperationDefinitions = {
	post_players_id_market_workflow: {
		method: "POST",
		path: "/api/v1/players/{id}/market/workflow",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: "application/json",
		bodyRequired: true,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [
			{
				name: "X-Repeat-Command",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "Idempotency-Key",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "X-Request-ID",
				required: false,
				style: "simple",
				explode: false
			}
		]
	},
	get_players_id_market_purchases_preview: {
		method: "GET",
		path: "/api/v1/players/{id}/market/purchases/preview",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "listingId",
			required: true,
			style: "form",
			explode: true
		}, {
			schema: { type: "integer" },
			name: "quantity",
			required: true,
			style: "form",
			explode: true
		}],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_players_id_market_shops_ownerId_browse: {
		method: "GET",
		path: "/api/v1/players/{id}/market/shops/{ownerId}/browse",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}, {
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "ownerId",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "page",
			required: false,
			style: "form",
			explode: true
		}],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_players_id_market_browse: {
		method: "GET",
		path: "/api/v1/players/{id}/market/browse",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [
			{
				schema: { type: "string" },
				name: "categoryType",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "string" },
				name: "categorySubtype",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "string" },
				name: "keyword",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: {
					type: "string",
					enum: [
						"latest",
						"price_asc",
						"price_desc",
						"grade_asc",
						"grade_desc"
					]
				},
				name: "sort",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: {
					type: "integer",
					minimum: 1
				},
				name: "page",
				required: false,
				style: "form",
				explode: true
			}
		],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_players_id_market_listings: {
		method: "GET",
		path: "/api/v1/players/{id}/market/listings",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "page",
			required: false,
			style: "form",
			explode: true
		}],
		headerParams: []
	},
	post_players_id_market_listings_refresh_locks: {
		method: "POST",
		path: "/api/v1/players/{id}/market/listings/refresh-locks",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_players_id_companion_shop: {
		method: "GET",
		path: "/api/v1/players/{id}/companion/shop",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "page",
			required: false,
			style: "form",
			explode: true
		}, {
			schema: {
				type: "string",
				enum: [
					"SPIRIT_STONE",
					"SPIRIT_CRYSTAL",
					"SPIRIT_MILK"
				]
			},
			name: "currencyCode",
			required: false,
			style: "form",
			explode: true
		}],
		headerParams: []
	},
	get_market_listings: {
		method: "GET",
		path: "/api/v1/market/listings",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [
			{
				schema: { type: "string" },
				name: "category",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "string" },
				name: "keyword",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "string" },
				name: "sort",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "integer" },
				name: "page",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "integer" },
				name: "pageSize",
				required: false,
				style: "form",
				explode: true
			}
		],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_market_listings_listingId: {
		method: "GET",
		path: "/api/v1/market/listings/{listingId}",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "listingId",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_market_listings_attributes: {
		method: "GET",
		path: "/api/v1/market/listings/attributes",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [{
			schema: { type: "string" },
			name: "ids",
			required: true,
			style: "form",
			explode: true
		}],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_market_lowest_price: {
		method: "GET",
		path: "/api/v1/market/lowest-price",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [{
			schema: { type: "string" },
			name: "category",
			required: true,
			style: "form",
			explode: true
		}, {
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "templateItemId",
			required: true,
			style: "form",
			explode: true
		}],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_market_average_price: {
		method: "GET",
		path: "/api/v1/market/average-price",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [{
			schema: { type: "string" },
			name: "itemName",
			required: true,
			style: "form",
			explode: true
		}, {
			schema: { type: "string" },
			name: "currencyCode",
			required: true,
			style: "form",
			explode: true
		}],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_market_shops: {
		method: "GET",
		path: "/api/v1/market/shops",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [
			{
				schema: {
					type: "string",
					minLength: 0
				},
				name: "cursor",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "integer" },
				name: "page",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "integer" },
				name: "pageSize",
				required: false,
				style: "form",
				explode: true
			}
		],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_market_shops_ranking: {
		method: "GET",
		path: "/api/v1/market/shops/ranking",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [{
			schema: { type: "integer" },
			name: "topN",
			required: false,
			style: "form",
			explode: true
		}],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_market_shops_userId: {
		method: "GET",
		path: "/api/v1/market/shops/{userId}",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "userId",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_players_id_market_purchase_quota: {
		method: "GET",
		path: "/api/v1/players/{id}/market/purchase-quota",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_players_id_market_price_range: {
		method: "GET",
		path: "/api/v1/players/{id}/market/price-range",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [{
			schema: { type: "string" },
			name: "category",
			required: true,
			style: "form",
			explode: true
		}, {
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "userItemId",
			required: true,
			style: "form",
			explode: true
		}],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_players_id_market_credibility: {
		method: "GET",
		path: "/api/v1/players/{id}/market/credibility",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_players_id_market_credibility_initialize: {
		method: "POST",
		path: "/api/v1/players/{id}/market/credibility/initialize",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_players_id_market_trades: {
		method: "GET",
		path: "/api/v1/players/{id}/market/trades",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [
			{
				schema: { type: "string" },
				name: "mode",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "integer" },
				name: "page",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "integer" },
				name: "pageSize",
				required: false,
				style: "form",
				explode: true
			}
		],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_players_id_market_sellable: {
		method: "GET",
		path: "/api/v1/players/{id}/market/sellable",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [
			{
				schema: { type: "string" },
				name: "category",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "string" },
				name: "subtype",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "integer" },
				name: "page",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "integer" },
				name: "pageSize",
				required: false,
				style: "form",
				explode: true
			}
		],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_players_id_market_shop: {
		method: "GET",
		path: "/api/v1/players/{id}/market/shop",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: []
	},
	post_players_id_market_shop_ensure: {
		method: "POST",
		path: "/api/v1/players/{id}/market/shop/ensure",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [{
			name: "Idempotency-Key",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	put_players_id_market_shop_name: {
		method: "PUT",
		path: "/api/v1/players/{id}/market/shop/name",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: "application/json",
		bodyRequired: true,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [{
			name: "X-Repeat-Command",
			required: false,
			style: "simple",
			explode: false
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	put_players_id_market_shop_description: {
		method: "PUT",
		path: "/api/v1/players/{id}/market/shop/description",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: "application/json",
		bodyRequired: true,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [
			{
				name: "X-Repeat-Command",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "Idempotency-Key",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "X-Request-ID",
				required: false,
				style: "simple",
				explode: false
			}
		]
	},
	post_players_id_market_listings: {
		method: "POST",
		path: "/api/v1/players/{id}/market/listings",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: "application/json",
		bodyRequired: true,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [{
			name: "Idempotency-Key",
			required: false,
			style: "simple",
			explode: false
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_players_id_market_listings_listingId_cancel: {
		method: "POST",
		path: "/api/v1/players/{id}/market/listings/{listingId}/cancel",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}, {
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "listingId",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [
			{
				name: "X-Repeat-Command",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "Idempotency-Key",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "X-Request-ID",
				required: false,
				style: "simple",
				explode: false
			}
		]
	},
	post_players_id_market_purchases: {
		method: "POST",
		path: "/api/v1/players/{id}/market/purchases",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: "application/json",
		bodyRequired: true,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [{
			name: "Idempotency-Key",
			required: false,
			style: "simple",
			explode: false
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	}
};

//#endregion
export { marketOperationDefinitions };