# Chapter 2 - Setup

## Library and Module

[_DynamoDB Entity Store_](https://github.com/symphoniacloud/dynamodb-entity-store) is available [from NPM](https://www.npmjs.com/package/@symphoniacloud/dynamodb-entity-store), and can be installed in the usual way, e.g.:

```
% npm install @symphoniacloud/dynamodb-entity-store
```

The library is provided in both CommonJS and ESModule form. All entrypoints are available from the root _index.js_ file.

> _I tried using package.json [exports](https://nodejs.org/api/packages.html#exports) but IDE support seems flakey, so I've reverted for now to just supporting a root "barrel" file_

## Instantiating Entity Store

The main entry point for Entity Store is the function [`createStore(config)`](https://symphoniacloud.github.io/dynamodb-entity-store/functions/createStore.html). This function returns an instance of the [`AllEntitiesStore`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/AllEntitiesStore.html) type which you can use to perform operations on your DynamoDB table(s).

`createStore(config)` takes one required argument and one optional argument:
* `tablesConfig` defines the names and configuration of all the tables you want to access through an instance of the Store.
* `context` provides implementations of various behaviors. If you don't use it then defaults are used.

For some scenarios using all the default values of DynamoDB Entity Store will be sufficient. In such a case you can instantiate your store as follows:

```typescript
const entityStore = createStore(createStandardSingleTableConfig('AnimalsTable')) // "AnimalsTable" is an example
```

Typically though you'll need to change behavior in some form. I'll start with describing how to update `context`.

### Overriding `context`

`context` is an object of type [`TableBackedStoreContext`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/TableBackedStoreContext.html), defined as follows:

```typescript
{
  logger: EntityStoreLogger
  dynamoDB: DynamoDBInterface
  clock: Clock
}
```

If you don't specify a context when calling `createStore()` then the default values are used, as follows:

* `logger` : No-op logger (Don't log)
* `dynamoDB` : Wrapper using default DynamoDB document client. (See below for details)
* `clock` : Real clock based on system time (it can be useful to override this in tests)

Use the [`createStoreContext()`](https://symphoniacloud.github.io/dynamodb-entity-store/functions/createStoreContext.html) function to create a context with different values.
With no arguments it provides precisely the same default values, but you can provide overrides as necessary. Here are a few such scenarios.

#### Overriding the DynamoDB Document Client or DynamoDB wrapper

By default DynamoDB Entity Store uses the default [DynamoDB Document Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/) object, which uses the AWS account and region in the current context (e.g. from environment variables) and default marshalling / unmarshalling (see the official [AWS Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/) for more details).

If you want to override any of this behavior you can provide your own Document Client object as the second argument to `createStoreContext()`.

For example to override the region you might call the following:

```typescript
const storeContext = createStoreContext({}, DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' })))
```

DynamoDB Entity Store uses a "wrapper" around the Document Client, which is the `dynamoDB` property on the Store Context. You can also override this, but typically you'd only do so for unit / in-process tests.

#### Specifying a logger

DynamoDB Entity Store will log various behavior at **debug level**. You can override the library's logger when calling `createStoreContext()`, e.g. `createStoreContext({ logger: consoleLogger })`.

The default implementation is a "no-op" logger, i.e. don't actually log anywhere.
However you can instead use the [`consoleLogger`](https://symphoniacloud.github.io/dynamodb-entity-store/variables/consoleLogger.html), or you can provide your own implementation of [`EntityStoreLogger`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/EntityStoreLogger.html). 
E.g. here's an implementation that uses the [AWS Powertools Logger](https://docs.powertools.aws.dev/lambda/typescript/latest/core/logger/) :

```typescript
// Create an implementation of DynamoDB Entity Store Logger using an underlying AWS Powertools Logger
function createPowertoolsEntityStoreLogger(logger: Logger): EntityStoreLogger {
  return {
    getLevelName() {
      return logger.getLevelName()
    },
    debug(input: LogItemMessage, ...extraInput) {
      logger.debug(input, ...extraInput)
    }
  }
}
```

#### Overriding the Clock

DynamoDB Entity Store uses a clock when generating the Last Updated and TTL attributes on items. By default this is the system clock, but you
can override this - typically you'd only want to do so in tests. For an example see [`FakeClock`](https://github.com/symphoniacloud/dynamodb-entity-store/blob/main/test/unit/testSupportCode/fakes/fakeClock.ts) in the project's own test code.

### Configuring Tables

DynamoDB entity store can use one or more tables when performing operations.
You specify your entire table configuration as the first argument of `createStore(config)`.
I'll first explain how to configure Entity Store when using one table, and then will expand this to why and how you might want to configure multiple tables.

#### Single-table Configuration

A single table is configured using the `TableConfig` interface:

```typescript
export interface TableConfig {
  tableName: string
  metaAttributeNames: {
    pk: string
    sk?: string
    gsisById?: Record<string, { pk: string; sk?: string }>
    ttl?: string
    entityType?: string
    lastUpdated?: string
  }
  allowScans?: boolean
  gsiNames?: Record<string, string>
}
```

If you want you can "hand-roll" this object, however there are support functions in [_setupSupport.ts_](../src/lib/support/setupSupport.ts) to help out. 

For example, say you want to use a "standard single table" configuration. To create one of these you can call `createStandardSingleTableConfig()`, just passing your underlying table name. The resulting configuration will be as follows:

```
{
  tableName: 'testTable',
  allowScans: false,
  metaAttributeNames: {
    pk: 'PK',
    sk: 'SK',
    ttl: 'ttl',
    entityType: '_et',
    lastUpdated: '_lastUpdated',
    gsisById: {
      gsi: {
        pk: 'GSIPK',
        sk: 'GSISK'
      }
    }
  },
  gsiNames: {
    gsi: 'GSI'
  }
}
```

This configuration is valid when:

* Your table partition key attribute is named `PK`
* You have a table sort key and the attribute is named `SK`
* You have one GSI (Global Secondary Index) which is named `GSI`. It has a string partition key named `GSIPK` and a string sort key named `GSISK`. You reference this in entities using the "logical" ID `gsi`.
* You want to automatically create `_et` and `_lastUpdated` attributes for each item.
* If you specify a TTL (Time-To-Live) value when writing an object then it will be stored in an attributed named `ttl`
* You don't want to allow scans

If any of your configuration is different from this you can do the following:

* Use the `createMinimumSingleTableConfig()` function, providing the table name and meta attribute names, and then add any other necessary properties
* Use the `createStandardSingleTableConfig()` function above, and replace properties
* Build your own implementation of `TableConfig`

The particular behaviors of this configuration will be explained in later parts of this manual.

#### When to use multi-table configuration

Some projects will use multiple DynamoDB tables. While I'm a fan of DynamoDB "single table design", I think there's often a place to use different tables for different operational reasons. And sometimes you'll be working in a project that doesn't use single table design.

When your project has multiple tables you can choose one of the following:

* Create an `AllEntitiesStore` per table, each store using single-table configuration
* Create one or several `AllEntitiesStore`(s) that have a multi-table configuration

The way that multi-table configuration works with DynamoDB Entity Store is that each entity can only be stored in one table, and in the setup configuration each table includes the list of entities contained within it.
To be clear - **one table can store multiple entities, but each entity can only be stored in one table**, for each Entity Store instance.

So if you want to store the same entity in multiple tables that immediately drives to using multiple `AllEntitiesStore` instances.

DynamoDB Entity Store uses one underlying Document Client per instance.
Another reason to use multiple instances therefore is if the different tables have different DynamoDB document client configuration. For example:

* Different tables are in different accounts / regions / have different credentials
* Different tables use different marshalling / unmarshalling options

However it's often the case that the constraint of one-table-per-entity, and common-document-client-per-table, is absolutely fine, and in such a case using a multi-table configuration of DynamoDB Entity Store can be used. This has the following advantages:

* Less code / state in your application
* Ability to perform transactions across multiple entities in different tables 

#### How to use multi-table configuration

To use a multi-table configuration call `createStore(config)` just as you would do for single-table, but
the config object needs to be of type `MultiTableConfig`, as follows:

```typescript
export interface MultiTableConfig {
  entityTables: MultiEntityTableConfig[]
  defaultTableName?: string
}

export interface MultiEntityTableConfig extends TableConfig {
  entityTypes?: string[]
}
```

In other words a multi-table config consists of:

* An array of regular `TableConfig` objects, each having the addition of array of entity type names stored in the table
* An optional default table name

The entity type names must be precisely the same as those specified in the `type` field of the _Entities_ you'll be using when performing operations.
When you make calls to the operations functions in Entity Store the library will first find the table configuration used for that _Entity_.

The `defaultTableName` property is useful if you have a situation where _most_ entities are in one table, but you have a few "special cases" of other entities being in different tables.

You have a few options of how to create a `MultiTableConfig` object:

* Use the `createStandardMultiTableConfig()` function if all of your tables use the same "standard" configuration described earlier
* Build your own configuration, optionally using the other support functions in [_setupSupport.ts_](../src/lib/support/setupSupport.ts).

## Caching / capturing Entity Store

Your store object contains, and may have instantiated, a DynamoDB client interface / document client.
It's typical to only a DynamoDB connection object once per configuration and application instance, partly because it has computational overhead.

As such I recommend that you typically treat your store instances in the same way as DynamoDB connection objects - in other words don't instantiate an entity store every time you need it, and instead cache it / capture it wherever you store your application's in-memory state.

A reason to do otherwise would be if you're managing your Document Client outside of DynamoDB Entity Store, and are using Entity Store in only a few places, rather than as your universal DynamoDB access layer.
In which case feel free to instantiate Entity Store where you need it, passing in your Document Client. 