export default function createMasterSchema(names, namesWithTables, namesWithoutTables, namesWithSubscriptions) {
  let schemaImports = namesWithTables
    .map(n => `import { query as ${n}Query, mutation as ${n}Mutation, type as ${n}Type } from './${n}/schema';`)
    .concat(namesWithSubscriptions.map(n => `import { subscription as ${n}Subscription } from './${n}/schema';`))
    .concat(namesWithoutTables.map(n => `import { type as ${n}Type } from './${n}/schema';`))
    .join("\n");

    let subscriptions = '';
    if(namesWithSubscriptions.length > 0){
      subscriptions = `type Subscription {
        ${namesWithSubscriptions.map(n => "${" + n + "Subscription}").join("\n\n    ")}
      }`;
    }

  return `${schemaImports}

export default \`
  scalar JSON

  type DeletionResultInfo {
    success: Boolean,
    Meta: MutationResultInfo
  }

  type MutationResultInfo {
    transaction: Boolean,
    elapsedTime: Int
  }

  type QueryResultsMetadata {
    count: Int
  }

  input StringArrayUpdate {
    index: Int,
    value: String
  }

  input IntArrayUpdate {
    index: Int,
    value: Int
  }

  input FloatArrayUpdate {
    index: Int,
    value: Float
  }

  ${names.map(n => "${" + n + "Type}").join("\n\n  ")}

  type Query {
    ${namesWithTables.map(n => "${" + n + "Query}").join("\n\n    ")}
  }

  type Mutation {
    ${namesWithTables.map(n => "${" + n + "Mutation}").join("\n\n    ")}
  }

  ${subscriptions}

\``;
}
