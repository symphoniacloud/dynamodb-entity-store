# Chapter 2 - Entities

**Prerequisite reading** - the very first part of [Setup](./Setup.md) on installing the library.

_Entity_ objects are used by DynamoDB Entity Store during all database operations for defining configuration and behavior.
Typically _Entity_ objects are defined as global constants within your app, only needing to be instantiated once per _Entity_ type.
Each _Entity_ object must satisfy the [`Entity` interface](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/Entity.html) :

```typescript
interface Entity<TItem extends TPKSource & TSKSource, TPKSource, TSKSource> {
  type: string
  pk(source: TPKSource): string
  sk(source: TSKSource): string
  convertToDynamoFormat?: EntityFormatter<TItem>
  parse: EntityParser<TItem>
  gsis?: Record<string, GsiGenerators>
}
```

## The `Entity` type

### Type signature

Every _Entity_ must satisfy the type signature `Entity<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>`.

`TItem` is intended to be the "internal" type of the object that you're persisting to DynamoDB.
`TItem` is both the type of the objects you are writing (e.g. using `put`) and the result of the items that you are reading (e.g. using `get` or `query`).

For example you may have an "internal" type like this:

```typescript
interface Sheep {
  breed: string
  name: string
  ageInYears: number
}
```

Your corresponding _Entity_ object would be of type `Entity<Sheep,...>`. 

`TPKSource` and `TSKSource` are the input types used for _generating_ Partition Key and Sort Key values. DynamoDB Entity Store needs these values whenever it is writing an object with `put`, and whenever else it needs to specify a key. `TPKSource` and `TSKSource` must each be a subset of your overall "internal" type.

> If your table only has a Partition Key, and doesn't have a Sort Key, see the section _PK-only Entities_ below.

With our example above, if the Partition Key for persisted sheep is based on the `breed` field, then `TPKSource` is:

```typescript
type SheepPKSource = {
  breed: string
}
```

and if the Sort Key for persisted sheep is based on the `name` field, then `TSKSource` is:

```typescript
type SheepSKSource = {
  name: string
}
```

However, since we know that both the PK source and SK Source types are subsets of `Sheep`, we can instead define the types using TypeScript `Pick` _utility type_:

```typescript
type SheepPKSource = Pick<Sheep, 'breed'>
type SheepSKSource = Pick<Sheep, 'name'>
```

We can then build our entire "Sheep Entity" type :

```typescript
Entity<Sheep, Pick<Sheep, 'breed'>, Pick<Sheep, 'name'>>
```

### `.type`

The `type` field must be a string, unique for each type of _Entity_ you access with an instance DynamoDB Entity Store. This value is used in a number of ways:

* Written as an attribute whenever you `put` an object, unless you configure not to do so at the table level. The default attribute name is `_et` (for "Entity Type"), but this is also configurable (see [previous chapter](Setup.md) for changing how and whether the entity type is automatically written to the table).
* To filter results during query and scan operations (unless configured otherwise).
* For logging, and error messages.

### `.pk()` and `.sk()`

Each _Entity_ must implement two functions which are used to _generate_ Partition Key and Sort Key values.
This occurs during many operations, including `put` and `get`. 

> If your table only has a Partition Key, and doesn't have a Sort Key, see the section _PK-only Entities_ below.

Each of the `pk()` and `sk()` is passed an argument of type `TPKSource` or `TSKSource`, as defined earlier, and should return a string.

Let's go back to our example of `Sheep` from earlier. Let's say we have a particular sheep object that is internally represented as follows:

```
{ breed: 'merino', name: 'shaun', ageInYears: 3 }
```

And let's say we'd like to store the following for our key attributes for such an object:

* Partition Key: `SHEEP#BREED#merino`
* Sort Key: `NAME#shaun`

Our `pk()` and `sk()` functions are then as follows:

```typescript
function pk({ breed }: Pick<Sheep, 'breed'>) {
  return `SHEEP#BREED#${breed}` 
}

function sk({ name }: Pick<Sheep, 'name'>) {
  return `NAME#${name}` 
}
```

> This example uses [destructuring syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment), but that's optional.

Notice that the parameter types here are precisely the same as those we gave for `TPKSource` and `TSKSource` in the _Entity_ type definition.

#### Less common scenarios

A couple of less common scenarios.

First - it's usually the case that the value of your PK / SK attributes will always contain all the actual field values defined in `TPKSource` / `TSKSource`, but that's not always true. In such situations just specify the full set of fields that **do** drive your PK / SK values, and then you can return whatever you like from the generator functions. 

Second - if either of your Partition Key or Sort Key attributes are also being used to store specific values of your table (in other words your table **does not** have separate '`PK`' and '`SK`' style attributes configured) then you can just return field values unmanipulated from your generator functions, **but you still need to implement the functions** . 

E.g. say you have an internal type as follows:

```typescript
interface Farm {
  name: string
  address: string
}
```

and say that your DynamoDB table **only** stores farms. In such a case you might choose to use the `name` field as the actual partition key. In such a case the `pk()` generator would be as follows:

```typescript
function pk({ name }: Pick<Farm, 'name'>) {
  return name
}
```

### `.convertToDynamoFormat()` (optional)

`convertToDynamoFormat()` is an optional function you may choose to implement in order to change how DynamoDB Entity Store writes an object to DynamoDB during `put` operations.
Since DynamoDB Entity Store uses the [AWS Document Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/) library under the covers, this is more about choosing which fields to save, and any field-level modification, rather than lower-level "marshalling".
If you need to change marshalling options at the AWS library level please refer to the [Setup chapter](Setup.md).

By default DynamoDB Entity Store will store all the fields of an object, unmanipulated, using the field names of the object. E.g. going back to our `Sheep` example, let's say we're writing the following object:

```
{ breed: 'merino', name: 'shaun', ageInYears: 3 }
```

This might result (depending on table configuration) in the following object being written to DynamoDB:

| `PK`                  | `SK`          | `breed`   | `name`   | `ageInYears` | `_et`   | `_lastUpdated`             |
|-----------------------|---------------|-----------|----------|--------------|---------|----------------------------|
| `SHEEP#BREED#merino`  | `NAME#shaun`  | `merino`  | `shaun`  | 3            | `sheep` | `2023-08-21T15:41:53.566Z` |

`PK` and `SK` come from calling the `pk()` and `sk()` generator functions, `_et` comes from the `.entityType` field, and `_lastUpdated` is the current date and time. The remaining fields - `breed`, `name`, and `ageInYears` - are simply a duplication of the original object.

The _metadata_ fields - `PK`, `SK`, `_et`, `_lastUpdated` - are controlled through other mechanisms, but if you want to change what _data_ fields are stored, and what values are stored for those fields, then you must implement `convertToDynamoFormat()`.

The type signature of `convertToDynamoFormat()` is: `(item: TItem) => DynamoDBValues`, in other words it receives an object of your "internal" type, and must return a valid DynamoDB Document Client object _(`DynamoDBValues` is simply an alias for `Record<string, NativeAttributeValue>`, where [`NativeAttributeValue` comes from the AWS library.](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-util-dynamodb/TypeAlias/NativeAttributeValue/))_

You may need to implement `convertToDynamoFormat()` in situations like the following:

* You don't want to persist all of the fields on your internal object
* You want to persist some or all fields with attribute names different from the internal object field names
* You want to store attributes not present on the internal object but that are available from a larger context
* You want to change the format of persisted values before storing them - e.g. changing a numeric Date field to a ISO string value, or changing a nested structure into an encoded form.

If you implement `convertToDynamoFormat()` you'll likely also need to consider a non-default implementation of `parse()`, which is discussed next.

### `.parse()`

Each _Entity_'s `parse()` function is used during read operations to convert the DynamoDB-persisted version of an item to the "internal" version of an item. As with `.convertToDynamoFormat()`, since DynamoDB Entity Store uses the [AWS Document Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/) library under the covers such parsing is less about low-level type manipulation and more about field selection and calculation.

As described above for `.convertToDynamoFormat()` - with DynamoDB Entity Store's default behavior the persisted version of object contains precisely the same fields as the internal version, and so in that case parsing consists of (a) removing all of the metadata fields and (b) validating the type, and returning a type-safe value. 

#### Type Predicate Parsing

The standard, and most simple case, is that you just need to implement a [_TypeScript Type Predicate_](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates). This is a function that validates the correct fields for a type are present.

Going back to our Sheep example, we can define a Type Predicate as follows:

```typescript
const isSheep = function (x: DynamoDBValues): x is Sheep {
  const candidate = x as Sheep
  return candidate.breed !== undefined && candidate.name !== undefined && candidate.ageInYears !== undefined
}
```

If we wanted we could actually be more precise here by checking the actual values are in the correct ranges.

To use the Type Predicate in our `Entity` definition we can use the [`typePredicateParser`](https://symphoniacloud.github.io/dynamodb-entity-store/functions/typePredicateParser.html) helper function. This helper function returns a parser that removes all the metadata fields, and then calls your type predicate, returning the type of your internal object.

Our `parse()` implementation for `SHEEP_ENTITY` is then defined by calling `typePredicateParser(isSheep, 'sheep')`.

#### Advanced Parsing

If simply performing a type check isn't sufficient for an _Entity_, then you need to implement a custom `EntityParser<TItem>` function. `EntityParser` is defined as follows: 

```typescript
type EntityParser<TItem> = (
  item: DynamoDBValues,
  allMetaAttributeNames: string[],
  metaAttributeNames: MetaAttributeNames
) => TItem
```

In other words:

* Given the source item in DynamoDB format...
* ... and the attribute names of all the metadata fields
* ... return an object of the correct internal format

### `.gsis` (optional)

The `gsis` field defines _generator_ functions for all of the Global Secondary Indexes (GSIs) an _Entity_ uses. In other words it's like `pk()` and `sk()`, but for GSIs instead of a table. If an _Entity_ doesn't use GSIs it can leave this field undefined.

The type of `gsis` is `Record<string, GsiGenerators>`, a map from a GSI identifier to a GSI PK generator, and optionally a GSI SK generator.

The **GSI identifier** will typically be the same as, or similar to, the name of your actual DynamoDB GSI. The mapping from _Entity_ GSI ID to DynamoDB GSI Name is configured in [Table Setup](Setup.md), but as an example the "standard" configuration uses `gsi` as the _Entity_ GSI ID, and `GSI` for the corresponding index name.

If you understand the table `pk()` and `sk()` generators then you'll understand the GSI Generators too. See the [example in the project README](https://github.com/symphoniacloud/dynamodb-entity-store/blob/main/README.md#example-2-adding-a-global-secondary-index) for an example. 

If your GSI doesn't have a sort key then you don't need to define an `sk()` function on the corresponding GSI generator.

If a table has a GSI, but there is no corresponding field under `.gsis` in an _Entity_ using that table, then no GSI key attribute values are written for that _Entity_.

## PK-only Tables and Entities

If a table only has a Partition Key and **does not** have a sort key then obviously it doesn't make sense to have a sort key type on the _Entity_, or an `sk()` generator function, for any _Entity_ items stored in that table.

In such a case your _Entity_ / _Entities_ can instead implement the [`PKOnlyEntity`](https://symphoniacloud.github.io/dynamodb-entity-store/types/PKOnlyEntity.html) type, and use the [`entityFromPkOnlyEntity`](https://symphoniacloud.github.io/dynamodb-entity-store/functions/entityFromPkOnlyEntity.html) support function.

See the [_Farms_ example](https://github.com/symphoniacloud/dynamodb-entity-store/blob/main/examples/src/example3Farms.ts) to see an example.

## Support Functions

There are various _Entity_-related support functions, which you can see in the [_entitySupport.ts_](https://github.com/symphoniacloud/dynamodb-entity-store/blob/main/src/lib/support/entitySupport.ts) module.

## Examples

For several examples, see the [examples directory](../examples/src) , but for quick reference here's the complete `SHEEP_ENTITY` example that I used in this page:

```typescript
interface Sheep {
  breed: string
  name: string
  ageInYears: number
}

const isSheep = function (x: DynamoDBValues): x is Sheep {
  const candidate = x as Sheep
  return candidate.breed !== undefined && candidate.name !== undefined && candidate.ageInYears !== undefined
}

export const SHEEP_ENTITY: Entity<Sheep, Pick<Sheep, 'breed'>, Pick<Sheep, 'name'>> = {
  type: 'sheep',
  parse: typePredicateParser(isSheep, 'sheep'),
  pk({ breed }: Pick<Sheep, 'breed'>) {
    return `SHEEP#BREED#${breed}`
  },
  sk({ name }: Pick<Sheep, 'name'>) {
    return `NAME#${name}`
  }
}
```