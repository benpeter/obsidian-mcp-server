You are a senior software architect. Your task is to analyze the provided codebase and generate a detailed plan for my developer to implement improvements.

Review this code base file by file, line by line, to fully understand our code base; you must identify all features, functions, utilities, and understand how they work with each other within the code base.

Identify any issues, gaps, inconsistencies, etc.
Additionally identify potential enhancements, including architectural changes, refactoring, etc.

Identify the modern 2025, best-practice approaches for what we're trying to accomplish; preferring the latest stable versions of libraries and frameworks.

Skip adding unit/integration tests - that is handled externally.

After you have properly reviewed the code base and mapped out the necessary changes, write out a detailed implementation plan to be shared with my developer on exactly what to change in our current code base to implement these improvements, new features, and optimizations.

# Full project repository tree

# mcp-ts-template - Directory Structure

Generated on: 2025-10-15 22:46:43

```
mcp-ts-template
├── .clinerules
│   └── AGENTS.md
├── .github
│   ├── codeql
│   │   └── codeql-config.yml
│   ├── workflows
│   │   └── publish.yml
│   └── FUNDING.yml
├── .husky
│   └── pre-commit
├── .storage
├── .vscode
│   └── settings.json
├── changelog
│   ├── archive1.md
│   └── archive2.md
├── coverage
│   ├── src
│   │   ├── config
│   │   │   ├── index.html
│   │   │   └── index.ts.html
│   │   ├── container
│   │   │   ├── registrations
│   │   │   │   ├── core.ts.html
│   │   │   │   ├── index.html
│   │   │   │   └── mcp.ts.html
│   │   │   ├── index.html
│   │   │   ├── index.ts.html
│   │   │   └── tokens.ts.html
│   │   ├── mcp-server
│   │   │   ├── prompts
│   │   │   │   ├── definitions
│   │   │   │   │   ├── code-review.prompt.ts.html
│   │   │   │   │   └── index.html
│   │   │   │   ├── utils
│   │   │   │   │   ├── index.html
│   │   │   │   │   └── promptDefinition.ts.html
│   │   │   │   ├── index.html
│   │   │   │   └── prompt-registration.ts.html
│   │   │   ├── resources
│   │   │   │   ├── definitions
│   │   │   │   │   ├── echo.resource.ts.html
│   │   │   │   │   └── index.html
│   │   │   │   ├── utils
│   │   │   │   │   ├── index.html
│   │   │   │   │   ├── resourceDefinition.ts.html
│   │   │   │   │   └── resourceHandlerFactory.ts.html
│   │   │   │   ├── index.html
│   │   │   │   └── resource-registration.ts.html
│   │   │   ├── roots
│   │   │   │   ├── index.html
│   │   │   │   └── roots-registration.ts.html
│   │   │   ├── tools
│   │   │   │   ├── definitions
│   │   │   │   │   ├── index.html
│   │   │   │   │   ├── template-cat-fact.tool.ts.html
│   │   │   │   │   ├── template-code-review-sampling.tool.ts.html
│   │   │   │   │   ├── template-echo-message.tool.ts.html
│   │   │   │   │   ├── template-image-test.tool.ts.html
│   │   │   │   │   └── template-madlibs-elicitation.tool.ts.html
│   │   │   │   ├── utils
│   │   │   │   │   ├── index.html
│   │   │   │   │   ├── toolDefinition.ts.html
│   │   │   │   │   └── toolHandlerFactory.ts.html
│   │   │   │   ├── index.html
│   │   │   │   └── tool-registration.ts.html
│   │   │   ├── transports
│   │   │   │   ├── auth
│   │   │   │   │   ├── lib
│   │   │   │   │   │   ├── authContext.ts.html
│   │   │   │   │   │   ├── authTypes.ts.html
│   │   │   │   │   │   ├── authUtils.ts.html
│   │   │   │   │   │   ├── index.html
│   │   │   │   │   │   └── withAuth.ts.html
│   │   │   │   │   ├── strategies
│   │   │   │   │   │   ├── authStrategy.ts.html
│   │   │   │   │   │   ├── index.html
│   │   │   │   │   │   ├── jwtStrategy.ts.html
│   │   │   │   │   │   └── oauthStrategy.ts.html
│   │   │   │   │   ├── authFactory.ts.html
│   │   │   │   │   ├── authMiddleware.ts.html
│   │   │   │   │   └── index.html
│   │   │   │   ├── http
│   │   │   │   │   ├── httpErrorHandler.ts.html
│   │   │   │   │   ├── httpTransport.ts.html
│   │   │   │   │   ├── httpTypes.ts.html
│   │   │   │   │   ├── index.html
│   │   │   │   │   ├── sessionIdUtils.ts.html
│   │   │   │   │   └── sessionStore.ts.html
│   │   │   │   ├── stdio
│   │   │   │   │   ├── index.html
│   │   │   │   │   └── stdioTransport.ts.html
│   │   │   │   ├── index.html
│   │   │   │   ├── ITransport.ts.html
│   │   │   │   └── manager.ts.html
│   │   │   ├── index.html
│   │   │   └── server.ts.html
│   │   ├── services
│   │   │   ├── graph
│   │   │   │   ├── core
│   │   │   │   │   ├── GraphService.ts.html
│   │   │   │   │   ├── IGraphProvider.ts.html
│   │   │   │   │   └── index.html
│   │   │   │   ├── providers
│   │   │   │   │   ├── index.html
│   │   │   │   │   └── surrealGraph.provider.ts.html
│   │   │   │   ├── index.html
│   │   │   │   └── types.ts.html
│   │   │   ├── llm
│   │   │   │   ├── core
│   │   │   │   │   ├── ILlmProvider.ts.html
│   │   │   │   │   └── index.html
│   │   │   │   ├── providers
│   │   │   │   │   ├── index.html
│   │   │   │   │   └── openrouter.provider.ts.html
│   │   │   │   ├── index.html
│   │   │   │   └── types.ts.html
│   │   │   └── speech
│   │   │       ├── core
│   │   │       │   ├── index.html
│   │   │       │   ├── ISpeechProvider.ts.html
│   │   │       │   └── SpeechService.ts.html
│   │   │       ├── providers
│   │   │       │   ├── elevenlabs.provider.ts.html
│   │   │       │   ├── index.html
│   │   │       │   └── whisper.provider.ts.html
│   │   │       ├── index.html
│   │   │       └── types.ts.html
│   │   ├── storage
│   │   │   ├── core
│   │   │   │   ├── index.html
│   │   │   │   ├── IStorageProvider.ts.html
│   │   │   │   ├── storageFactory.ts.html
│   │   │   │   ├── StorageService.ts.html
│   │   │   │   └── storageValidation.ts.html
│   │   │   └── providers
│   │   │       ├── cloudflare
│   │   │       │   ├── index.html
│   │   │       │   ├── kvProvider.ts.html
│   │   │       │   └── r2Provider.ts.html
│   │   │       ├── fileSystem
│   │   │       │   ├── fileSystemProvider.ts.html
│   │   │       │   └── index.html
│   │   │       ├── inMemory
│   │   │       │   ├── index.html
│   │   │       │   └── inMemoryProvider.ts.html
│   │   │       ├── supabase
│   │   │       │   ├── index.html
│   │   │       │   ├── supabase.types.ts.html
│   │   │       │   └── supabaseProvider.ts.html
│   │   │       └── surrealdb
│   │   │           ├── auth
│   │   │           │   ├── authManager.ts.html
│   │   │           │   ├── index.html
│   │   │           │   ├── permissionHelpers.ts.html
│   │   │           │   └── scopeDefinitions.ts.html
│   │   │           ├── core
│   │   │           │   ├── connectionManager.ts.html
│   │   │           │   ├── index.html
│   │   │           │   ├── queryBuilder.ts.html
│   │   │           │   ├── surrealDbClient.ts.html
│   │   │           │   └── transactionManager.ts.html
│   │   │           ├── events
│   │   │           │   ├── eventManager.ts.html
│   │   │           │   ├── eventTypes.ts.html
│   │   │           │   ├── index.html
│   │   │           │   └── triggerBuilder.ts.html
│   │   │           ├── functions
│   │   │           │   ├── customFunctions.ts.html
│   │   │           │   ├── functionRegistry.ts.html
│   │   │           │   └── index.html
│   │   │           ├── graph
│   │   │           │   ├── graphOperations.ts.html
│   │   │           │   ├── graphTypes.ts.html
│   │   │           │   ├── index.html
│   │   │           │   ├── pathFinder.ts.html
│   │   │           │   └── relationshipManager.ts.html
│   │   │           ├── introspection
│   │   │           │   ├── index.html
│   │   │           │   └── schemaIntrospector.ts.html
│   │   │           ├── kv
│   │   │           │   ├── index.html
│   │   │           │   └── surrealKvProvider.ts.html
│   │   │           ├── migrations
│   │   │           │   ├── index.html
│   │   │           │   ├── migrationRunner.ts.html
│   │   │           │   └── migrationTypes.ts.html
│   │   │           ├── query
│   │   │           │   ├── forLoopBuilder.ts.html
│   │   │           │   ├── index.html
│   │   │           │   └── subqueryBuilder.ts.html
│   │   │           ├── index.html
│   │   │           └── types.ts.html
│   │   ├── types-global
│   │   │   ├── errors.ts.html
│   │   │   └── index.html
│   │   ├── utils
│   │   │   ├── formatting
│   │   │   │   ├── index.html
│   │   │   │   └── markdownBuilder.ts.html
│   │   │   ├── internal
│   │   │   │   ├── error-handler
│   │   │   │   │   ├── errorHandler.ts.html
│   │   │   │   │   ├── helpers.ts.html
│   │   │   │   │   ├── index.html
│   │   │   │   │   ├── mappings.ts.html
│   │   │   │   │   └── types.ts.html
│   │   │   │   ├── encoding.ts.html
│   │   │   │   ├── health.ts.html
│   │   │   │   ├── index.html
│   │   │   │   ├── logger.ts.html
│   │   │   │   ├── performance.ts.html
│   │   │   │   ├── requestContext.ts.html
│   │   │   │   ├── runtime.ts.html
│   │   │   │   └── startupBanner.ts.html
│   │   │   ├── metrics
│   │   │   │   ├── index.html
│   │   │   │   ├── registry.ts.html
│   │   │   │   └── tokenCounter.ts.html
│   │   │   ├── network
│   │   │   │   ├── fetchWithTimeout.ts.html
│   │   │   │   └── index.html
│   │   │   ├── parsing
│   │   │   │   ├── csvParser.ts.html
│   │   │   │   ├── dateParser.ts.html
│   │   │   │   ├── index.html
│   │   │   │   ├── jsonParser.ts.html
│   │   │   │   ├── pdfParser.ts.html
│   │   │   │   ├── xmlParser.ts.html
│   │   │   │   └── yamlParser.ts.html
│   │   │   ├── scheduling
│   │   │   │   ├── index.html
│   │   │   │   └── scheduler.ts.html
│   │   │   ├── security
│   │   │   │   ├── idGenerator.ts.html
│   │   │   │   ├── index.html
│   │   │   │   ├── rateLimiter.ts.html
│   │   │   │   └── sanitization.ts.html
│   │   │   └── telemetry
│   │   │       ├── index.html
│   │   │       ├── instrumentation.ts.html
│   │   │       ├── metrics.ts.html
│   │   │       ├── semconv.ts.html
│   │   │       └── trace.ts.html
│   │   ├── index.html
│   │   ├── index.ts.html
│   │   └── worker.ts.html
│   ├── base.css
│   ├── block-navigation.js
│   ├── coverage-final.json
│   ├── favicon.png
│   ├── index.html
│   ├── prettify.css
│   ├── prettify.js
│   ├── sort-arrow-sprite.png
│   └── sorter.js
├── docs
│   ├── mcp-specification
│   │   └── 2025-06-18
│   │       ├── best-practices
│   │       │   └── security.md
│   │       ├── core
│   │       │   ├── authorization.md
│   │       │   ├── lifecycle.md
│   │       │   ├── overview.md
│   │       │   └── transports.md
│   │       └── utils
│   │           ├── cancellation.md
│   │           ├── completion.md
│   │           ├── logging.md
│   │           ├── pagination.md
│   │           ├── ping.md
│   │           └── progress.md
│   ├── mcp-elicitation-summary.md
│   ├── publishing-mcp-server-registry.md
│   ├── storage-surrealdb-setup.md
│   ├── surrealdb-schema.surql
│   └── tree.md
├── ideas
├── schemas
│   └── surrealdb
│       ├── surrealdb-events-schema.surql
│       ├── surrealdb-functions-schema.surql
│       ├── surrealdb-graph-schema.surql
│       ├── surrealdb-schema.surql
│       └── surrealdb-secure-schema.surql
├── scripts
│   ├── clean.ts
│   ├── devcheck.ts
│   ├── devdocs.ts
│   ├── fetch-openapi-spec.ts
│   ├── make-executable.ts
│   ├── tree.ts
│   ├── update-coverage.ts
│   └── validate-mcp-publish-schema.ts
├── src
│   ├── config
│   │   └── index.ts
│   ├── container
│   │   ├── registrations
│   │   │   ├── core.ts
│   │   │   └── mcp.ts
│   │   ├── index.ts
│   │   └── tokens.ts
│   ├── mcp-server
│   │   ├── prompts
│   │   │   ├── definitions
│   │   │   │   ├── code-review.prompt.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils
│   │   │   │   └── promptDefinition.ts
│   │   │   └── prompt-registration.ts
│   │   ├── resources
│   │   │   ├── definitions
│   │   │   │   ├── echo.resource.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils
│   │   │   │   ├── resourceDefinition.ts
│   │   │   │   └── resourceHandlerFactory.ts
│   │   │   └── resource-registration.ts
│   │   ├── roots
│   │   │   └── roots-registration.ts
│   │   ├── tools
│   │   │   ├── definitions
│   │   │   │   ├── index.ts
│   │   │   │   ├── template-cat-fact.tool.ts
│   │   │   │   ├── template-code-review-sampling.tool.ts
│   │   │   │   ├── template-echo-message.tool.ts
│   │   │   │   ├── template-image-test.tool.ts
│   │   │   │   └── template-madlibs-elicitation.tool.ts
│   │   │   ├── utils
│   │   │   │   ├── index.ts
│   │   │   │   ├── toolDefinition.ts
│   │   │   │   └── toolHandlerFactory.ts
│   │   │   └── tool-registration.ts
│   │   ├── transports
│   │   │   ├── auth
│   │   │   │   ├── lib
│   │   │   │   │   ├── authContext.ts
│   │   │   │   │   ├── authTypes.ts
│   │   │   │   │   ├── authUtils.ts
│   │   │   │   │   └── withAuth.ts
│   │   │   │   ├── strategies
│   │   │   │   │   ├── authStrategy.ts
│   │   │   │   │   ├── jwtStrategy.ts
│   │   │   │   │   └── oauthStrategy.ts
│   │   │   │   ├── authFactory.ts
│   │   │   │   ├── authMiddleware.ts
│   │   │   │   └── index.ts
│   │   │   ├── http
│   │   │   │   ├── httpErrorHandler.ts
│   │   │   │   ├── httpTransport.ts
│   │   │   │   ├── httpTypes.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── sessionIdUtils.ts
│   │   │   │   └── sessionStore.ts
│   │   │   ├── stdio
│   │   │   │   ├── index.ts
│   │   │   │   └── stdioTransport.ts
│   │   │   ├── ITransport.ts
│   │   │   └── manager.ts
│   │   └── server.ts
│   ├── services
│   │   ├── graph
│   │   │   ├── core
│   │   │   │   ├── GraphService.ts
│   │   │   │   └── IGraphProvider.ts
│   │   │   ├── providers
│   │   │   │   └── surrealGraph.provider.ts
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── llm
│   │   │   ├── core
│   │   │   │   └── ILlmProvider.ts
│   │   │   ├── providers
│   │   │   │   └── openrouter.provider.ts
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   └── speech
│   │       ├── core
│   │       │   ├── ISpeechProvider.ts
│   │       │   └── SpeechService.ts
│   │       ├── providers
│   │       │   ├── elevenlabs.provider.ts
│   │       │   └── whisper.provider.ts
│   │       ├── index.ts
│   │       └── types.ts
│   ├── storage
│   │   ├── core
│   │   │   ├── IStorageProvider.ts
│   │   │   ├── storageFactory.ts
│   │   │   ├── StorageService.ts
│   │   │   └── storageValidation.ts
│   │   ├── providers
│   │   │   ├── cloudflare
│   │   │   │   ├── index.ts
│   │   │   │   ├── kvProvider.ts
│   │   │   │   └── r2Provider.ts
│   │   │   ├── fileSystem
│   │   │   │   └── fileSystemProvider.ts
│   │   │   ├── inMemory
│   │   │   │   └── inMemoryProvider.ts
│   │   │   ├── supabase
│   │   │   │   ├── supabase.types.ts
│   │   │   │   └── supabaseProvider.ts
│   │   │   └── surrealdb
│   │   │       ├── auth
│   │   │       │   ├── authManager.ts
│   │   │       │   ├── permissionHelpers.ts
│   │   │       │   └── scopeDefinitions.ts
│   │   │       ├── core
│   │   │       │   ├── connectionManager.ts
│   │   │       │   ├── queryBuilder.ts
│   │   │       │   ├── surrealDbClient.ts
│   │   │       │   └── transactionManager.ts
│   │   │       ├── events
│   │   │       │   ├── eventManager.ts
│   │   │       │   ├── eventTypes.ts
│   │   │       │   └── triggerBuilder.ts
│   │   │       ├── functions
│   │   │       │   ├── customFunctions.ts
│   │   │       │   └── functionRegistry.ts
│   │   │       ├── graph
│   │   │       │   ├── graphOperations.ts
│   │   │       │   ├── graphTypes.ts
│   │   │       │   ├── pathFinder.ts
│   │   │       │   └── relationshipManager.ts
│   │   │       ├── introspection
│   │   │       │   └── schemaIntrospector.ts
│   │   │       ├── kv
│   │   │       │   └── surrealKvProvider.ts
│   │   │       ├── migrations
│   │   │       │   ├── migrationRunner.ts
│   │   │       │   └── migrationTypes.ts
│   │   │       ├── query
│   │   │       │   ├── forLoopBuilder.ts
│   │   │       │   └── subqueryBuilder.ts
│   │   │       ├── index.ts
│   │   │       ├── README.md
│   │   │       └── types.ts
│   │   ├── index.ts
│   │   └── README.md
│   ├── types-global
│   │   └── errors.ts
│   ├── utils
│   │   ├── formatting
│   │   │   ├── index.ts
│   │   │   └── markdownBuilder.ts
│   │   ├── internal
│   │   │   ├── error-handler
│   │   │   │   ├── errorHandler.ts
│   │   │   │   ├── helpers.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── mappings.ts
│   │   │   │   └── types.ts
│   │   │   ├── encoding.ts
│   │   │   ├── health.ts
│   │   │   ├── index.ts
│   │   │   ├── logger.ts
│   │   │   ├── performance.ts
│   │   │   ├── requestContext.ts
│   │   │   ├── runtime.ts
│   │   │   └── startupBanner.ts
│   │   ├── metrics
│   │   │   ├── index.ts
│   │   │   ├── registry.ts
│   │   │   └── tokenCounter.ts
│   │   ├── network
│   │   │   ├── fetchWithTimeout.ts
│   │   │   └── index.ts
│   │   ├── pagination
│   │   │   └── index.ts
│   │   ├── parsing
│   │   │   ├── csvParser.ts
│   │   │   ├── dateParser.ts
│   │   │   ├── index.ts
│   │   │   ├── jsonParser.ts
│   │   │   ├── pdfParser.ts
│   │   │   ├── xmlParser.ts
│   │   │   └── yamlParser.ts
│   │   ├── scheduling
│   │   │   ├── index.ts
│   │   │   └── scheduler.ts
│   │   ├── security
│   │   │   ├── idGenerator.ts
│   │   │   ├── index.ts
│   │   │   ├── rateLimiter.ts
│   │   │   └── sanitization.ts
│   │   ├── telemetry
│   │   │   ├── index.ts
│   │   │   ├── instrumentation.ts
│   │   │   ├── metrics.ts
│   │   │   ├── semconv.ts
│   │   │   └── trace.ts
│   │   └── index.ts
│   ├── index.ts
│   └── worker.ts
├── tests
│   ├── config
│   │   ├── index.int.test.ts
│   │   └── index.test.ts
│   ├── container
│   │   ├── registrations
│   │   │   ├── core.test.ts
│   │   │   └── mcp.test.ts
│   │   ├── index.test.ts
│   │   └── tokens.test.ts
│   ├── mcp-server
│   │   ├── prompts
│   │   │   ├── definitions
│   │   │   │   └── code-review.prompt.test.ts
│   │   │   ├── utils
│   │   │   │   └── promptDefinition.test.ts
│   │   │   └── prompt-registration.test.ts
│   │   ├── resources
│   │   │   ├── definitions
│   │   │   │   ├── echo.resource.test.ts
│   │   │   │   └── index.test.ts
│   │   │   ├── utils
│   │   │   │   ├── resourceDefinition.test.ts
│   │   │   │   └── resourceHandlerFactory.test.ts
│   │   │   └── resource-registration.test.ts
│   │   ├── roots
│   │   │   └── roots-registration.test.ts
│   │   ├── tools
│   │   │   ├── definitions
│   │   │   │   ├── index.test.ts
│   │   │   │   ├── template-cat-fact.tool.test.ts
│   │   │   │   ├── template-code-review-sampling.tool.test.ts
│   │   │   │   ├── template-echo-message.tool.test.ts
│   │   │   │   ├── template-image-test.tool.test.ts
│   │   │   │   └── template-madlibs-elicitation.tool.test.ts
│   │   │   ├── utils
│   │   │   │   ├── core
│   │   │   │   ├── index.test.ts
│   │   │   │   ├── toolDefinition.test.ts
│   │   │   │   └── toolHandlerFactory.test.ts
│   │   │   └── tool-registration.test.ts
│   │   ├── transports
│   │   │   ├── auth
│   │   │   │   ├── lib
│   │   │   │   │   ├── authContext.test.ts
│   │   │   │   │   ├── authTypes.test.ts
│   │   │   │   │   ├── authUtils.test.ts
│   │   │   │   │   └── withAuth.test.ts
│   │   │   │   ├── strategies
│   │   │   │   │   ├── authStrategy.test.ts
│   │   │   │   │   ├── jwtStrategy.test.ts
│   │   │   │   │   └── oauthStrategy.test.ts
│   │   │   │   ├── authFactory.test.ts
│   │   │   │   ├── authMiddleware.test.ts
│   │   │   │   └── index.test.ts
│   │   │   ├── http
│   │   │   │   ├── httpErrorHandler.test.ts
│   │   │   │   ├── httpTransport.integration.test.ts
│   │   │   │   ├── httpTransport.test.ts
│   │   │   │   ├── httpTypes.test.ts
│   │   │   │   ├── index.test.ts
│   │   │   │   ├── sessionIdUtils.test.ts
│   │   │   │   └── sessionStore.test.ts
│   │   │   ├── stdio
│   │   │   │   ├── index.test.ts
│   │   │   │   └── stdioTransport.test.ts
│   │   │   ├── ITransport.test.ts
│   │   │   └── manager.test.ts
│   │   └── server.test.ts.disabled
│   ├── mocks
│   │   ├── handlers.ts
│   │   └── server.ts
│   ├── scripts
│   │   └── devdocs.test.ts
│   ├── services
│   │   ├── graph
│   │   │   ├── core
│   │   │   │   ├── GraphService.test.ts
│   │   │   │   └── IGraphProvider.test.ts
│   │   │   ├── providers
│   │   │   │   └── surrealGraph.provider.test.ts
│   │   │   ├── index.test.ts
│   │   │   └── types.test.ts
│   │   ├── llm
│   │   │   ├── core
│   │   │   │   └── ILlmProvider.test.ts
│   │   │   ├── providers
│   │   │   │   ├── openrouter.provider.test.ts
│   │   │   │   └── openrouter.provider.test.ts.disabled
│   │   │   ├── index.test.ts
│   │   │   └── types.test.ts
│   │   └── speech
│   │       ├── core
│   │       │   ├── ISpeechProvider.test.ts
│   │       │   └── SpeechService.test.ts
│   │       ├── providers
│   │       │   ├── elevenlabs.provider.test.ts
│   │       │   └── whisper.provider.test.ts
│   │       ├── index.test.ts
│   │       └── types.test.ts
│   ├── storage
│   │   ├── core
│   │   │   ├── IStorageProvider.test.ts
│   │   │   ├── storageFactory.test.ts
│   │   │   └── storageValidation.test.ts
│   │   ├── providers
│   │   │   ├── cloudflare
│   │   │   │   ├── kvProvider.test.ts
│   │   │   │   └── r2Provider.test.ts
│   │   │   ├── fileSystem
│   │   │   │   └── fileSystemProvider.test.ts
│   │   │   ├── inMemory
│   │   │   │   └── inMemoryProvider.test.ts
│   │   │   ├── supabase
│   │   │   │   ├── supabase.types.test.ts
│   │   │   │   └── supabaseProvider.test.ts
│   │   │   └── surrealdb
│   │   │       ├── surrealdb.types.test.ts
│   │   │       └── surrealKvProvider.test.ts
│   │   ├── index.test.ts
│   │   ├── storageProviderCompliance.test.ts
│   │   └── StorageService.test.ts
│   ├── types-global
│   │   └── errors.test.ts
│   ├── utils
│   │   ├── formatting
│   │   │   ├── index.test.ts
│   │   │   └── markdownBuilder.test.ts
│   │   ├── internal
│   │   │   ├── error-handler
│   │   │   │   ├── errorHandler.test.ts
│   │   │   │   ├── helpers.test.ts
│   │   │   │   ├── index.test.ts
│   │   │   │   ├── mappings.test.ts
│   │   │   │   └── types.test.ts
│   │   │   ├── encoding.test.ts
│   │   │   ├── errorHandler.int.test.ts
│   │   │   ├── errorHandler.unit.test.ts
│   │   │   ├── health.test.ts
│   │   │   ├── logger.int.test.ts
│   │   │   ├── performance.init.test.ts
│   │   │   ├── performance.test.ts
│   │   │   ├── requestContext.test.ts
│   │   │   ├── runtime.test.ts
│   │   │   └── startupBanner.test.ts
│   │   ├── metrics
│   │   │   ├── index.test.ts
│   │   │   ├── registry.test.ts
│   │   │   └── tokenCounter.test.ts
│   │   ├── network
│   │   │   ├── fetchWithTimeout.test.ts
│   │   │   └── index.test.ts
│   │   ├── pagination
│   │   │   └── index.test.ts
│   │   ├── parsing
│   │   │   ├── csvParser.test.ts
│   │   │   ├── dateParser.test.ts
│   │   │   ├── index.test.ts
│   │   │   ├── jsonParser.test.ts
│   │   │   ├── pdfParser.test.ts
│   │   │   ├── xmlParser.test.ts
│   │   │   └── yamlParser.test.ts
│   │   ├── scheduling
│   │   │   ├── index.test.ts
│   │   │   └── scheduler.test.ts
│   │   ├── security
│   │   │   ├── idGenerator.test.ts
│   │   │   ├── index.test.ts
│   │   │   ├── rateLimiter.test.ts
│   │   │   └── sanitization.test.ts
│   │   ├── telemetry
│   │   │   ├── index.test.ts
│   │   │   ├── instrumentation.test.ts
│   │   │   ├── metrics.test.ts
│   │   │   ├── semconv.test.ts
│   │   │   └── trace.test.ts
│   │   └── index.test.ts
│   ├── index.test.ts
│   ├── setup.ts
│   └── worker.test.ts
├── .dockerignore
├── .env.example
├── .gitattributes
├── .gitignore
├── .prettierignore
├── .prettierrc.json
├── AGENTS.md
├── bun.lock
├── bunfig.toml
├── CHANGELOG.md
├── CLAUDE.md
├── Dockerfile
├── eslint.config.js
├── LICENSE
├── package.json
├── README.md
├── repomix.config.json
├── server.json
├── smithery.yaml
├── tsconfig.json
├── tsconfig.test.json
├── tsdoc.json
├── typedoc.json
├── vitest.config.ts
└── wrangler.toml
```

_Note: This tree excludes files and directories matched by .gitignore and default patterns._

---

# I want to focus in on the following section of our code base. Map out the changes in detail. Remember to include all relevant files and their paths, use our existing code style (i.e. file headers, etc.), and adhere to architectural best practices while properly integrating the changes into our current code base.

This file is a merged representation of a subset of the codebase, containing files not matching ignore patterns, combined into a single document by Repomix.
The content has been processed where line numbers have been added.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching these patterns are excluded: .clinerules/, .github/, .storage/, .vscode/, CHANGELOG.md, changelog/, coverage/, docs/, repomix.config.json, .husky/_, @hono/node-server, chrono-node, dotenv, hono, zod, typescript
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Line numbers have been added to the beginning of each line
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
core/
  GraphService.ts
  IGraphProvider.ts
providers/
  surrealGraph.provider.ts
index.ts
types.ts
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="core/GraphService.ts">
  1: /**
  2:  * @fileoverview Graph service orchestrator.
  3:  * Manages graph database operations with provider abstraction.
  4:  * @module src/services/graph/core/GraphService
  5:  */
  6: 
  7: import { logger, type RequestContext } from '@/utils/index.js';
  8: import type { IGraphProvider } from './IGraphProvider.js';
  9: import type {
 10:   Edge,
 11:   GraphPath,
 12:   TraversalResult,
 13:   RelateOptions,
 14:   TraversalOptions,
 15:   PathOptions,
 16: } from './IGraphProvider.js';
 17: 
 18: /**
 19:  * Service for managing graph database operations.
 20:  *
 21:  * @remarks
 22:  * Provides a unified interface for graph operations across different providers.
 23:  * Currently supports SurrealDB as the primary graph backend.
 24:  *
 25:  * @example
 26:  * ```ts
 27:  * const graphService = new GraphService(surrealGraphProvider);
 28:  *
 29:  * // Create a relationship
 30:  * const edge = await graphService.relate(
 31:  *   'user:alice',
 32:  *   'follows',
 33:  *   'user:bob',
 34:  *   context,
 35:  *   { data: { since: '2025-01-01' } }
 36:  * );
 37:  *
 38:  * // Traverse the graph
 39:  * const result = await graphService.traverse('user:alice', context, {
 40:  *   maxDepth: 2,
 41:  *   edgeTypes: ['follows']
 42:  * });
 43:  * ```
 44:  */
 45: export class GraphService {
 46:   constructor(private readonly provider: IGraphProvider) {
 47:     logger.info(`Graph service initialized with provider: ${provider.name}`);
 48:   }
 49: 
 50:   /**
 51:    * Get the underlying provider.
 52:    */
 53:   getProvider(): IGraphProvider {
 54:     return this.provider;
 55:   }
 56: 
 57:   /**
 58:    * Create a relationship between two vertices.
 59:    *
 60:    * @param from - Source vertex ID
 61:    * @param edgeTable - Edge table/type name
 62:    * @param to - Target vertex ID
 63:    * @param context - Request context
 64:    * @param options - Relationship options
 65:    * @returns The created edge
 66:    */
 67:   async relate(
 68:     from: string,
 69:     edgeTable: string,
 70:     to: string,
 71:     context: RequestContext,
 72:     options?: RelateOptions,
 73:   ): Promise<Edge> {
 74:     logger.debug(
 75:       `[GraphService] Creating relationship: ${from} -[${edgeTable}]-> ${to}`,
 76:       context,
 77:     );
 78: 
 79:     return this.provider.relate(from, edgeTable, to, context, options);
 80:   }
 81: 
 82:   /**
 83:    * Delete a relationship.
 84:    *
 85:    * @param edgeId - Edge identifier
 86:    * @param context - Request context
 87:    * @returns True if deleted
 88:    */
 89:   async unrelate(edgeId: string, context: RequestContext): Promise<boolean> {
 90:     logger.debug(`[GraphService] Deleting relationship: ${edgeId}`, context);
 91: 
 92:     return this.provider.unrelate(edgeId, context);
 93:   }
 94: 
 95:   /**
 96:    * Traverse the graph from a starting vertex.
 97:    *
 98:    * @param startVertexId - Starting vertex ID
 99:    * @param context - Request context
100:    * @param options - Traversal options
101:    * @returns Traversal result with paths
102:    */
103:   async traverse(
104:     startVertexId: string,
105:     context: RequestContext,
106:     options?: TraversalOptions,
107:   ): Promise<TraversalResult> {
108:     logger.debug(`[GraphService] Traversing from: ${startVertexId}`, context);
109: 
110:     return this.provider.traverse(startVertexId, context, options);
111:   }
112: 
113:   /**
114:    * Find the shortest path between two vertices.
115:    *
116:    * @param from - Source vertex ID
117:    * @param to - Target vertex ID
118:    * @param context - Request context
119:    * @param options - Pathfinding options
120:    * @returns Shortest path or null
121:    */
122:   async shortestPath(
123:     from: string,
124:     to: string,
125:     context: RequestContext,
126:     options?: PathOptions,
127:   ): Promise<GraphPath | null> {
128:     logger.debug(
129:       `[GraphService] Finding shortest path: ${from} -> ${to}`,
130:       context,
131:     );
132: 
133:     return this.provider.shortestPath(from, to, context, options);
134:   }
135: 
136:   /**
137:    * Get outgoing edges from a vertex.
138:    *
139:    * @param vertexId - Vertex identifier
140:    * @param context - Request context
141:    * @param edgeTypes - Optional edge type filter
142:    * @returns Array of outgoing edges
143:    */
144:   async getOutgoingEdges(
145:     vertexId: string,
146:     context: RequestContext,
147:     edgeTypes?: string[],
148:   ): Promise<Edge[]> {
149:     return this.provider.getOutgoingEdges(vertexId, context, edgeTypes);
150:   }
151: 
152:   /**
153:    * Get incoming edges to a vertex.
154:    *
155:    * @param vertexId - Vertex identifier
156:    * @param context - Request context
157:    * @param edgeTypes - Optional edge type filter
158:    * @returns Array of incoming edges
159:    */
160:   async getIncomingEdges(
161:     vertexId: string,
162:     context: RequestContext,
163:     edgeTypes?: string[],
164:   ): Promise<Edge[]> {
165:     return this.provider.getIncomingEdges(vertexId, context, edgeTypes);
166:   }
167: 
168:   /**
169:    * Check if a path exists between two vertices.
170:    *
171:    * @param from - Source vertex ID
172:    * @param to - Target vertex ID
173:    * @param context - Request context
174:    * @param maxDepth - Maximum depth to search
175:    * @returns True if path exists
176:    */
177:   async pathExists(
178:     from: string,
179:     to: string,
180:     context: RequestContext,
181:     maxDepth?: number,
182:   ): Promise<boolean> {
183:     return this.provider.pathExists(from, to, context, maxDepth);
184:   }
185: 
186:   /**
187:    * Health check for the graph provider.
188:    *
189:    * @returns True if provider is healthy
190:    */
191:   async healthCheck(): Promise<boolean> {
192:     return this.provider.healthCheck();
193:   }
194: }
</file>

<file path="core/IGraphProvider.ts">
  1: /**
  2:  * @fileoverview Interface for graph database providers.
  3:  * Defines the contract for graph operations including relationships and traversals.
  4:  * @module src/services/graph/core/IGraphProvider
  5:  */
  6: 
  7: import type { RequestContext } from '@/utils/index.js';
  8: 
  9: /**
 10:  * Direction for graph traversal.
 11:  */
 12: export type TraversalDirection = 'out' | 'in' | 'both';
 13: 
 14: /**
 15:  * Represents a vertex (node) in the graph.
 16:  */
 17: export interface Vertex {
 18:   /** Unique identifier for the vertex */
 19:   id: string;
 20:   /** Table/type of the vertex */
 21:   table: string;
 22:   /** Vertex data */
 23:   data: Record<string, unknown>;
 24: }
 25: 
 26: /**
 27:  * Represents an edge (relationship) in the graph.
 28:  */
 29: export interface Edge {
 30:   /** Unique identifier for the edge */
 31:   id: string;
 32:   /** Table/type of the edge */
 33:   table: string;
 34:   /** Source vertex ID */
 35:   from: string;
 36:   /** Target vertex ID */
 37:   to: string;
 38:   /** Edge metadata */
 39:   data: Record<string, unknown>;
 40: }
 41: 
 42: /**
 43:  * Options for relationship creation.
 44:  */
 45: export interface RelateOptions {
 46:   /** Edge metadata to store */
 47:   data?: Record<string, unknown>;
 48:   /** Whether to allow duplicate relationships */
 49:   allowDuplicates?: boolean;
 50: }
 51: 
 52: /**
 53:  * Options for graph traversal queries.
 54:  */
 55: export interface TraversalOptions {
 56:   /** Maximum depth to traverse (default: 1) */
 57:   maxDepth?: number;
 58:   /** Direction to traverse (default: 'out') */
 59:   direction?: TraversalDirection;
 60:   /** Filter edges by type */
 61:   edgeTypes?: string[];
 62:   /** Filter vertices by type */
 63:   vertexTypes?: string[];
 64:   /** WHERE clause for filtering */
 65:   where?: string;
 66: }
 67: 
 68: /**
 69:  * Result of a graph traversal.
 70:  */
 71: export interface TraversalResult {
 72:   /** Starting vertex */
 73:   start: Vertex;
 74:   /** Paths found during traversal */
 75:   paths: GraphPath[];
 76: }
 77: 
 78: /**
 79:  * Represents a path through the graph.
 80:  */
 81: export interface GraphPath {
 82:   /** Vertices in the path */
 83:   vertices: Vertex[];
 84:   /** Edges connecting the vertices */
 85:   edges: Edge[];
 86:   /** Total weight/cost of the path */
 87:   weight?: number;
 88: }
 89: 
 90: /**
 91:  * Options for pathfinding algorithms.
 92:  */
 93: export interface PathOptions {
 94:   /** Maximum path length to search */
 95:   maxLength?: number;
 96:   /** Weight function for edges */
 97:   weightFn?: (edge: Edge) => number;
 98:   /** Algorithm to use */
 99:   algorithm?: 'dijkstra' | 'bfs' | 'dfs';
100: }
101: 
102: /**
103:  * Defines the contract for graph database operations.
104:  *
105:  * @remarks
106:  * Providers must implement vertex/edge CRUD operations,
107:  * relationship creation, and graph traversal algorithms.
108:  */
109: export interface IGraphProvider {
110:   /**
111:    * Provider name identifier.
112:    */
113:   readonly name: string;
114: 
115:   /**
116:    * Create a relationship between two vertices.
117:    *
118:    * @param from - Source vertex ID
119:    * @param edgeTable - Edge table/type name
120:    * @param to - Target vertex ID
121:    * @param context - Request context for logging
122:    * @param options - Relationship options
123:    * @returns The created edge
124:    */
125:   relate(
126:     from: string,
127:     edgeTable: string,
128:     to: string,
129:     context: RequestContext,
130:     options?: RelateOptions,
131:   ): Promise<Edge>;
132: 
133:   /**
134:    * Delete a relationship edge.
135:    *
136:    * @param edgeId - Edge identifier
137:    * @param context - Request context for logging
138:    * @returns True if deleted
139:    */
140:   unrelate(edgeId: string, context: RequestContext): Promise<boolean>;
141: 
142:   /**
143:    * Traverse the graph from a starting vertex.
144:    *
145:    * @param startVertexId - Starting vertex ID
146:    * @param context - Request context for logging
147:    * @param options - Traversal options
148:    * @returns Traversal result with paths
149:    */
150:   traverse(
151:     startVertexId: string,
152:     context: RequestContext,
153:     options?: TraversalOptions,
154:   ): Promise<TraversalResult>;
155: 
156:   /**
157:    * Find the shortest path between two vertices.
158:    *
159:    * @param from - Source vertex ID
160:    * @param to - Target vertex ID
161:    * @param context - Request context for logging
162:    * @param options - Pathfinding options
163:    * @returns Shortest path or null if no path exists
164:    */
165:   shortestPath(
166:     from: string,
167:     to: string,
168:     context: RequestContext,
169:     options?: PathOptions,
170:   ): Promise<GraphPath | null>;
171: 
172:   /**
173:    * Get all outgoing edges from a vertex.
174:    *
175:    * @param vertexId - Vertex identifier
176:    * @param context - Request context for logging
177:    * @param edgeTypes - Optional filter by edge types
178:    * @returns Array of outgoing edges
179:    */
180:   getOutgoingEdges(
181:     vertexId: string,
182:     context: RequestContext,
183:     edgeTypes?: string[],
184:   ): Promise<Edge[]>;
185: 
186:   /**
187:    * Get all incoming edges to a vertex.
188:    *
189:    * @param vertexId - Vertex identifier
190:    * @param context - Request context for logging
191:    * @param edgeTypes - Optional filter by edge types
192:    * @returns Array of incoming edges
193:    */
194:   getIncomingEdges(
195:     vertexId: string,
196:     context: RequestContext,
197:     edgeTypes?: string[],
198:   ): Promise<Edge[]>;
199: 
200:   /**
201:    * Check if a path exists between two vertices.
202:    *
203:    * @param from - Source vertex ID
204:    * @param to - Target vertex ID
205:    * @param context - Request context for logging
206:    * @param maxDepth - Maximum depth to search
207:    * @returns True if path exists
208:    */
209:   pathExists(
210:     from: string,
211:     to: string,
212:     context: RequestContext,
213:     maxDepth?: number,
214:   ): Promise<boolean>;
215: 
216:   /**
217:    * Perform health check on the provider.
218:    *
219:    * @returns True if provider is healthy
220:    */
221:   healthCheck(): Promise<boolean>;
222: }
</file>

<file path="providers/surrealGraph.provider.ts">
  1: /**
  2:  * @fileoverview SurrealDB implementation of the graph provider interface.
  3:  * Implements graph operations using SurrealDB's RELATE and graph traversal features.
  4:  * @module src/services/graph/providers/surrealGraph.provider
  5:  */
  6: 
  7: import { inject, injectable } from 'tsyringe';
  8: import type Surreal from 'surrealdb';
  9: 
 10: import { SurrealdbClient } from '@/container/tokens.js';
 11: import { McpError, JsonRpcErrorCode } from '@/types-global/errors.js';
 12: import { ErrorHandler, logger, type RequestContext } from '@/utils/index.js';
 13: import type {
 14:   IGraphProvider,
 15:   Edge,
 16:   GraphPath,
 17:   TraversalResult,
 18:   RelateOptions,
 19:   TraversalOptions,
 20:   PathOptions,
 21: } from '../core/IGraphProvider.js';
 22: 
 23: /**
 24:  * SurrealDB graph provider implementation.
 25:  *
 26:  * @remarks
 27:  * Uses SurrealDB's native graph features:
 28:  * - RELATE statement for creating edges
 29:  * - Graph traversal operators (->, <-, <->)
 30:  * - Path finding algorithms
 31:  */
 32: @injectable()
 33: export class SurrealGraphProvider implements IGraphProvider {
 34:   readonly name = 'surrealdb-graph';
 35: 
 36:   constructor(@inject(SurrealdbClient) private readonly client: Surreal) {}
 37: 
 38:   async relate(
 39:     from: string,
 40:     edgeTable: string,
 41:     to: string,
 42:     context: RequestContext,
 43:     options?: RelateOptions,
 44:   ): Promise<Edge> {
 45:     return ErrorHandler.tryCatch(
 46:       async () => {
 47:         logger.debug(
 48:           `[SurrealGraphProvider] Creating edge: ${from} -[${edgeTable}]-> ${to}`,
 49:           context,
 50:         );
 51: 
 52:         // Build RELATE query
 53:         const dataClause = options?.data
 54:           ? `SET ${Object.entries(options.data)
 55:               .map(([key, _]) => `${key} = $${key}`)
 56:               .join(', ')}`
 57:           : '';
 58: 
 59:         const query = `
 60:           RELATE $from->${edgeTable}->$to
 61:           ${dataClause}
 62:           RETURN AFTER
 63:         `;
 64: 
 65:         const params: Record<string, unknown> = {
 66:           from,
 67:           to,
 68:           ...(options?.data || {}),
 69:         };
 70: 
 71:         const result = await this.client.query<[{ result: Edge[] }]>(
 72:           query,
 73:           params,
 74:         );
 75: 
 76:         const edge = result[0]?.result?.[0];
 77: 
 78:         if (!edge) {
 79:           throw new McpError(
 80:             JsonRpcErrorCode.InternalError,
 81:             'Failed to create relationship',
 82:             context,
 83:           );
 84:         }
 85: 
 86:         logger.debug(
 87:           `[SurrealGraphProvider] Edge created: ${edge.id}`,
 88:           context,
 89:         );
 90: 
 91:         return edge;
 92:       },
 93:       {
 94:         operation: 'SurrealGraphProvider.relate',
 95:         context,
 96:         input: { from, edgeTable, to },
 97:       },
 98:     );
 99:   }
100: 
101:   async unrelate(edgeId: string, context: RequestContext): Promise<boolean> {
102:     return ErrorHandler.tryCatch(
103:       async () => {
104:         const query = 'DELETE $edgeId RETURN BEFORE';
105: 
106:         const result = await this.client.query<[{ result: Edge[] }]>(query, {
107:           edgeId,
108:         });
109: 
110:         const deleted = result[0]?.result?.[0];
111:         return deleted !== undefined;
112:       },
113:       {
114:         operation: 'SurrealGraphProvider.unrelate',
115:         context,
116:         input: { edgeId },
117:       },
118:     );
119:   }
120: 
121:   async traverse(
122:     startVertexId: string,
123:     context: RequestContext,
124:     options?: TraversalOptions,
125:   ): Promise<TraversalResult> {
126:     return ErrorHandler.tryCatch(
127:       async () => {
128:         const maxDepth = options?.maxDepth ?? 1;
129:         const direction = options?.direction ?? 'out';
130: 
131:         // Build traversal operator
132:         const operator = this.getTraversalOperator(direction);
133: 
134:         // Build WHERE clause if needed
135:         const whereClause = options?.where ? `WHERE ${options.where}` : '';
136: 
137:         // For multi-hop traversal, use recursive traversal syntax
138:         const depthOperator =
139:           maxDepth > 1 ? `${operator.repeat(maxDepth)}` : operator;
140: 
141:         const query = `
142:           SELECT
143:             id,
144:             ${depthOperator} as connections
145:           FROM $startVertex
146:           ${whereClause}
147:         `;
148: 
149:         const result = await this.client.query<
150:           [
151:             {
152:               result: Array<{
153:                 id: string;
154:                 connections: unknown[];
155:               }>;
156:             },
157:           ]
158:         >(query, {
159:           startVertex: startVertexId,
160:         });
161: 
162:         const data = result[0]?.result?.[0];
163: 
164:         if (!data) {
165:           throw new McpError(
166:             JsonRpcErrorCode.InvalidParams,
167:             `Vertex not found: ${startVertexId}`,
168:             context,
169:           );
170:         }
171: 
172:         // Transform result into TraversalResult format
173:         // This is simplified - full implementation would parse the connections
174:         return {
175:           start: {
176:             id: startVertexId,
177:             table: this.extractTableName(startVertexId),
178:             data: {},
179:           },
180:           paths: [], // TODO: Parse connections into paths
181:         };
182:       },
183:       {
184:         operation: 'SurrealGraphProvider.traverse',
185:         context,
186:         input: { startVertexId, options },
187:       },
188:     );
189:   }
190: 
191:   async shortestPath(
192:     from: string,
193:     to: string,
194:     context: RequestContext,
195:     _options?: PathOptions,
196:   ): Promise<GraphPath | null> {
197:     return ErrorHandler.tryCatch(
198:       async () => {
199:         // Use recursive traversal to find paths
200:         const query = `
201:           SELECT * FROM (
202:             SELECT
203:               id,
204:               ->->->->->->->->->-> as paths
205:             FROM $from
206:           )
207:           WHERE $to IN paths..id
208:           LIMIT 1
209:         `;
210: 
211:         const result = await this.client.query<[{ result: unknown[] }]>(query, {
212:           from,
213:           to,
214:         });
215: 
216:         const data = result[0]?.result;
217: 
218:         if (!data || data.length === 0) {
219:           return null;
220:         }
221: 
222:         // TODO: Parse result into GraphPath format
223:         return {
224:           vertices: [],
225:           edges: [],
226:         };
227:       },
228:       {
229:         operation: 'SurrealGraphProvider.shortestPath',
230:         context,
231:         input: { from, to },
232:       },
233:     );
234:   }
235: 
236:   async getOutgoingEdges(
237:     vertexId: string,
238:     context: RequestContext,
239:     _edgeTypes?: string[],
240:   ): Promise<Edge[]> {
241:     return ErrorHandler.tryCatch(
242:       async () => {
243:         const query = `
244:           SELECT -> as edges FROM $vertexId
245:         `;
246: 
247:         const result = await this.client.query<
248:           [{ result: Array<{ edges: Edge[] }> }]
249:         >(query, { vertexId });
250: 
251:         const edges = result[0]?.result?.[0]?.edges ?? [];
252:         return edges;
253:       },
254:       {
255:         operation: 'SurrealGraphProvider.getOutgoingEdges',
256:         context,
257:         input: { vertexId },
258:       },
259:     );
260:   }
261: 
262:   async getIncomingEdges(
263:     vertexId: string,
264:     context: RequestContext,
265:     _edgeTypes?: string[],
266:   ): Promise<Edge[]> {
267:     return ErrorHandler.tryCatch(
268:       async () => {
269:         const query = `SELECT <- as edges FROM $vertexId`;
270: 
271:         const result = await this.client.query<
272:           [{ result: Array<{ edges: Edge[] }> }]
273:         >(query, { vertexId });
274: 
275:         const edges = result[0]?.result?.[0]?.edges ?? [];
276:         return edges;
277:       },
278:       {
279:         operation: 'SurrealGraphProvider.getIncomingEdges',
280:         context,
281:         input: { vertexId },
282:       },
283:     );
284:   }
285: 
286:   async pathExists(
287:     from: string,
288:     to: string,
289:     context: RequestContext,
290:     maxDepth: number = 5,
291:   ): Promise<boolean> {
292:     return ErrorHandler.tryCatch(
293:       async () => {
294:         const path = await this.shortestPath(from, to, context, {
295:           maxLength: maxDepth,
296:         });
297:         return path !== null;
298:       },
299:       {
300:         operation: 'SurrealGraphProvider.pathExists',
301:         context,
302:         input: { from, to, maxDepth },
303:       },
304:     );
305:   }
306: 
307:   async healthCheck(): Promise<boolean> {
308:     try {
309:       await this.client.query('SELECT 1 as healthy');
310:       return true;
311:     } catch {
312:       return false;
313:     }
314:   }
315: 
316:   /**
317:    * Get traversal operator based on direction.
318:    */
319:   private getTraversalOperator(direction: 'out' | 'in' | 'both'): string {
320:     switch (direction) {
321:       case 'out':
322:         return '->';
323:       case 'in':
324:         return '<-';
325:       case 'both':
326:         return '<->';
327:       default:
328:         return '->';
329:     }
330:   }
331: 
332:   /**
333:    * Extract table name from a record ID.
334:    */
335:   private extractTableName(recordId: string): string {
336:     const parts = recordId.split(':');
337:     return parts[0] || '';
338:   }
339: }
</file>

<file path="index.ts">
1: /**
2:  * @fileoverview Graph database service exports.
3:  * @module src/services/graph
4:  */
5: 
6: export { GraphService } from './core/GraphService.js';
7: export { SurrealGraphProvider } from './providers/surrealGraph.provider.js';
8: export type { IGraphProvider } from './core/IGraphProvider.js';
9: export type * from './types.js';
</file>

<file path="types.ts">
 1: /**
 2:  * @fileoverview Type definitions for graph database operations.
 3:  * @module src/services/graph/types
 4:  */
 5: 
 6: export type {
 7:   Vertex,
 8:   Edge,
 9:   GraphPath,
10:   TraversalResult,
11:   TraversalDirection,
12:   RelateOptions,
13:   TraversalOptions,
14:   PathOptions,
15: } from './core/IGraphProvider.js';
16: 
17: /**
18:  * Graph provider type identifier.
19:  */
20: export type GraphProviderType = 'surrealdb' | 'mock';
21: 
22: /**
23:  * Configuration for graph service.
24:  */
25: export interface GraphServiceConfig {
26:   /** Provider type to use */
27:   provider: GraphProviderType;
28:   /** Additional provider-specific configuration */
29:   config?: Record<string, unknown>;
30: }
31: 
32: /**
33:  * Statistics about a graph.
34:  */
35: export interface GraphStats {
36:   /** Total number of vertices */
37:   vertexCount: number;
38:   /** Total number of edges */
39:   edgeCount: number;
40:   /** Average degree (edges per vertex) */
41:   avgDegree: number;
42:   /** Vertex types and their counts */
43:   vertexTypes: Record<string, number>;
44:   /** Edge types and their counts */
45:   edgeTypes: Record<string, number>;
46: }
47: 
48: /**
49:  * Pattern for graph matching.
50:  */
51: export interface GraphPattern {
52:   /** Pattern string (e.g., "(person)-[knows]->(person)") */
53:   pattern: string;
54:   /** Parameters for the pattern */
55:   params?: Record<string, unknown>;
56: }
57: 
58: /**
59:  * Result of pattern matching.
60:  */
61: export interface PatternMatchResult {
62:   /** Matched subgraphs */
63:   matches: Array<{
64:     /** Vertices in the matched path */
65:     vertices: Array<{
66:       id: string;
67:       table: string;
68:       data: Record<string, unknown>;
69:     }>;
70:     /** Edges in the matched path */
71:     edges: Array<{
72:       id: string;
73:       table: string;
74:       from: string;
75:       to: string;
76:       data: Record<string, unknown>;
77:     }>;
78:     /** Path weight */
79:     weight?: number;
80:   }>;
81:   /** Total number of matches */
82:   count: number;
83: }
</file>

</files>

---
**Reminder:**
Based on your analysis, write out detailed instructions for a developer to implement the changes in our current code base. For each proposed change, specify the file path and include code snippets when necessary, focusing on a detailed and concise explanation of *why* the change is being made. The plan should be structured to be easily followed and implemented.

Please remember:
- Adhere to our programming principles found within the existing code reviewed above.
- Ensure all new code has JSDoc comments and follows our structured logging standards.
- Remember to use any included services for internal services like logging, error handling, request context, and external API calls.
- Before completing the task, run 'bun devcheck' (lint, type check, etc.) to maintain code consistency.