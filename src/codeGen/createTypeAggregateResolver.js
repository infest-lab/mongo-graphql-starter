import fs from "fs";
import path from "path";
import { TAB, TAB2 } from "./utilities";
import { MongoIdType, StringType, StringArrayType, MongoIdArrayType } from "../dataTypes";

export default function createGraphqlResolver(objectToCreate, options) {
  let template = fs.readFileSync(path.resolve(__dirname, "./resolverAggregateTemplate.txt"), { encoding: "utf8" });
  let projectOneToOneResolverTemplate = fs.readFileSync(path.resolve(__dirname, "./projectOneToOneResolverTemplate.txt"), { encoding: "utf8" });
  let projectOneToManyResolverTemplate = fs.readFileSync(path.resolve(__dirname, "./projectOneToManyResolverTemplate.txt"), { encoding: "utf8" });
  let projectManyToManyResolverTemplate = fs.readFileSync(path.resolve(__dirname, "./projectManyToManyResolverTemplate.txt"), { encoding: "utf8" });

  let aggregateHasManyResolverTemplate = fs.readFileSync(path.resolve(__dirname, "./aggregateHasManyResolverTemplate.txt"), { encoding: "utf8" });
  let aggregateManyManyResolverTemplate = fs.readFileSync(path.resolve(__dirname, "./aggregateManyManyResolverTemplate.txt"), { encoding: "utf8" });
  let aggregateGroupResolverTemplate = fs.readFileSync(path.resolve(__dirname, "./aggregateGroupResolverTemplate.txt"), { encoding: "utf8" });
  let aggregateObjectResolverTemplate = fs.readFileSync(path.resolve(__dirname, "./aggregateObjectResolverTemplate.txt"), { encoding: "utf8" });
  let aggregateCountResolverTemplate = fs.readFileSync(path.resolve(__dirname, "./aggregateCountResolverTemplate.txt"), { encoding: "utf8" });
  let aggregateQueryResolverTemplate = fs.readFileSync(path.resolve(__dirname, "./aggregateQueryResolverTemplate.txt"), { encoding: "utf8" });

  let getItemTemplate = fs.readFileSync(path.resolve(__dirname, "./resolverTemplateMethods/getItem.txt"), { encoding: "utf8" });
  let allItemsTemplate = fs.readFileSync(path.resolve(__dirname, "./resolverTemplateMethods/allItems.txt"), { encoding: "utf8" });
  let hooksPath = `"../hooks"`;
  let readonly = objectToCreate.readonly;
  let subscription = objectToCreate.subscription;


  let objName = objectToCreate.__name;
  let table = objectToCreate.table;

  if (options.hooks) {
    hooksPath = `"` + path.relative(options.modulePath, options.hooks).replace(/\\/g, "/") + `"`;
  }

  let result = "";
  let extras = objectToCreate.extras || {};
  let overrides = new Set(extras.overrides || []);
  let resolverSources = extras.resolverSources || [];
  let imports = [
    `import { insertUtilities, queryUtilities, projectUtilities, updateUtilities, processHook, dbHelpers, resolverHelpers } from "mongo-graphql-starter";`,
    `import hooksObj from ${hooksPath};`,
    `const { decontructGraphqlQuery, cleanUpResults } = queryUtilities;`,
    `const { setUpOneToManyRelationships, newObjectFromArgs } = insertUtilities;`,
    `const { getMongoProjection, parseRequestedFields } = projectUtilities;`,
    `const { getUpdateObject, setUpOneToManyRelationshipsForUpdate } = updateUtilities;`,
    `import { ObjectId } from "mongodb";`,
    `import ${objName}Metadata from "./${objName}";`,
    ...resolverSources.map(
      (src, i) =>
        `import ResolverExtras${i + 1} from "${src}";\nconst { Query: QueryExtras${i + 1}, Mutation: MutationExtras${i + 1}, Subscription: SubscriptionExtras${i + 1}, ...OtherExtras${i +
          1} } = ResolverExtras${i + 1};`
    )
  ];
  let typeImports = new Set([]);
  let aggregateResolvers = '';
  let queryItems = '';
  if (objectToCreate.aggregates) {
    Object.keys(objectToCreate.aggregates).forEach((aggregateName, index, all) => {
      let aggregate = objectToCreate.aggregates[aggregateName];
      // let foreignKeyType = objectToCreate.fields[aggregate.field];
      // let keyType = aggregate.type.fields[aggregate.keyField];
      // let keyTypeIsArray = /Array/g.test(keyType);

      if (aggregate.type && !typeImports.has(aggregate.type.__name)) {
        typeImports.add(aggregate.type.__name);
        imports.push(`import { load${aggregate.type.__name}s } from "../${aggregate.type.__name}/resolver";`);
        imports.push(`import ${aggregate.type.__name}Metadata from "../${aggregate.type.__name}/${aggregate.type.__name}";`);
      }

      if (!typeImports.has("flatMap")) {
        typeImports.add("flatMap");
        imports.push(`import flatMap from "lodash.flatmap";`);
      }

      if (!typeImports.has("dataloader")) {
        typeImports.add("dataloader");
        imports.push(`import DataLoader from "dataloader";`);
      }

      // console.log('aggregate.__isIds:',aggregate.__isIds)
      if (aggregate.__isIds) {
        aggregateResolvers += aggregateHasManyResolverTemplate
          .replace(/\${targetObjName}/g, aggregateName)
          .replace(/\${table}/g, aggregate.type.table)
          .replace(/\${keyField}/g, aggregate.keyField || "_id")
          .replace(/\${targetTypeName}/g, aggregate.type.__name);

      } else if (aggregate.__isGroup) {
        aggregateResolvers += aggregateGroupResolverTemplate
          .replace(/\${targetObjName}/g, aggregateName)
          .replace(/\${table}/g, aggregate.type.table)
          .replace(/\${keyField}/g, aggregate.keyField || "_id")
          .replace(/\${targetTypeName}/g, aggregate.type.__name);
      } else if (aggregate.__isObject) {
        aggregateResolvers += aggregateObjectResolverTemplate
          .replace(/\${targetObjName}/g, aggregateName)
          .replace(/\${table}/g, aggregate.type.table)
          .replace(/\${keyField}/g, aggregate.keyField || "_id")
          .replace(/\${targetTypeName}/g, aggregate.type.__name)
          .replace(/\${dataLoaderId}/g, `__${objName}_${aggregateName}DataLoader`);
      } else if (aggregate.__isCount) {
        let template = aggregateCountResolverTemplate
        aggregateResolvers += aggregateCountResolverTemplate
          .replace(/\${targetObjName}/g, aggregateName);
      }

      if (index < all.length - 1) {
        aggregateResolvers += ",\n";
      }
    });
  }

  if(objectToCreate.for){
    queryItems += aggregateQueryResolverTemplate
      .replace(/\${targetObjName}/g, objName)
      .replace(/\${table}/g, objectToCreate.for.type.table)
      .replace(/\${keyField}/g, objectToCreate.for.keyField || "_id")
      .replace(/\${targetTypeName}/g, objectToCreate.for.type.__name);
    if (objectToCreate.for.type && !typeImports.has(objectToCreate.for.type.__name)) {
      typeImports.add(objectToCreate.for.type.__name);
      imports.push(`import { load${objectToCreate.for.type.__name}s } from "../${objectToCreate.for.type.__name}/resolver";`);
      imports.push(`import ${objectToCreate.for.type.__name}Metadata from "../${objectToCreate.for.type.__name}/${objectToCreate.for.type.__name}";`);
    }
  }

  // let queryItems = [
  //   !overrides.has(`get${objName}`) ? getItemTemplate : "",
  //   !overrides.has(`all${objName}s`) ? allItemsTemplate : "",
  //   resolverSources.map((src, i) => `${TAB2}...(QueryExtras${i + 1} || {})`).join(",\n")
  // ]
  //   .filter(s => s)
  //   .join(",\n");

  let typeExtras = resolverSources.map((src, i) => `${TAB2}...(OtherExtras${i + 1} || {})`).join(",\n");

  let deleteCleanups = [];

  const getDeleteCleanups = () => {
    if(deleteCleanups.length > 0) return `${deleteCleanups.join(`;\n        `)};`;
    return "\n";
  };

  result += template
    .replace(/\${queryItems}/g, queryItems)
    .replace(/\${typeExtras}/g, typeExtras)
    .replace(/\${mutationItems}/g, '')
    .replace(/\${subscriptionItems}/g, '')
    .replace(/\${aggregateResolvers}/g, aggregateResolvers)
    .replace(/\${table}/g, '')
    .replace(/\${objName}/g, objName)
    .replace(/\${objNameLower}/g, objName.toLowerCase());


  return `
${imports.join("\n")}


${result}`.trim();
}
