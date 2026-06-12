# DynamoDB Entity Store Test Utils

Test utilities for [DynamoDB Entity Store](https://github.com/symphoniacloud/dynamodb-entity-store).

The main feature of this package is `FakeDynamoDBInterface` - an **in-memory fake** of Entity Store's
`DynamoDBInterface` type. By using it your unit tests can exercise code that uses Entity Store without
connecting to DynamoDB, or requiring any AWS credentials.

> [!WARNING]
> This package is for **tests only** - never use it in production code. It implements a subset of
> DynamoDB behavior, and is in no way intended to be a complete or robust DynamoDB emulation.

The fake is deliberately **fail-fast**: any operation or parameter that isn't supported throws an
error rather than silently misbehaving. So if your tests pass with the fake, the fake was actually
doing what your code asked of it.

## Installation

```
% npm install --save-dev @symphoniacloud/dynamodb-entity-store-testutils
```

Versions of this package are released in lockstep with `@symphoniacloud/dynamodb-entity-store` - use the same
version of each.

## Usage

Construct a `FakeDynamoDBInterface` with the key configuration of each of your tables, then pass it to
`createStore` via the store context:

```typescript
import {
  createStandardSingleTableConfig,
  createStore,
  createStoreContext
} from '@symphoniacloud/dynamodb-entity-store'
import { FakeDynamoDBInterface } from '@symphoniacloud/dynamodb-entity-store-testutils'

const dynamoDB = new FakeDynamoDBInterface({
  AnimalsTable: {
    pkName: 'PK',
    skName: 'SK',
    gsis: {
      GSI: { pkName: 'GSIPK', skName: 'GSISK' }
    }
  }
})

const entityStore = createStore(
  createStandardSingleTableConfig('AnimalsTable'),
  createStoreContext({ dynamoDB })
)
```

`entityStore` now behaves like a regular Entity Store, but reads and writes in-memory data. In tests you
can inspect or seed the underlying "table" directly using the convenience functions on the fake:

```typescript
dynamoDB.putToTable('AnimalsTable', { PK: 'SHEEP#BREED#merino', SK: 'NAME#shaun', name: 'shaun' })
dynamoDB.getFromTable('AnimalsTable', { PK: 'SHEEP#BREED#merino', SK: 'NAME#shaun' })
dynamoDB.getAllFromTable('AnimalsTable')
```

For a larger example of using the fake in an application's test suite, see
[Cicada](https://github.com/symphoniacloud/cicada).

## What's supported

* `put`, including condition expressions (`attribute_exists`, `attribute_not_exists`, `begins_with`,
  comparisons, `AND` / `OR` / `NOT`)
* `get` and `delete`
* `batchWrite` (puts and deletes)
* `transactionWrite` (`Put` and `Delete` operations)
* `query` (one page and all pages): key condition expressions (`=`, `<`, `<=`, `>`, `>=`, `BETWEEN`,
  `begins_with`), GSI queries with sparse-index behavior, sort key ordering, `ScanIndexForward`,
  and paging with `Limit` / `ExclusiveStartKey` / `LastEvaluatedKey`
* `scan` (one page and all pages) - returns all items in the table

Parameters that only affect performance or diagnostics (e.g. `ConsistentRead`, `ReturnConsumedCapacity`)
are accepted and ignored.

## What's NOT supported

Everything else - most notably:

* `update`, `batchGet`, and `transactionGet`
* `Update` and `ConditionCheck` operations in `transactionWrite`
* `FilterExpression` and `ProjectionExpression`

All unsupported operations and parameters **throw an error** when used.

The expression evaluators used by the fake (`evaluateConditionExpression`,
`parseKeyConditionExpression`, `matchesKeyCondition`) are also exported, in case they're useful for your
own test code.

## Questions / feedback

Please use the [project issues](https://github.com/symphoniacloud/dynamodb-entity-store/issues), or feel
free to email me: [mike@symphonia.io](mailto:mike@symphonia.io) .
