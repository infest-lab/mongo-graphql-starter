import { mutationStart, mutationError, mutationOver, mutationMeta, mutationComplete } from "../mutationHelpers";
import pluralize from "pluralize";

export default ({ objName, table }) => `    async update${pluralize(objName)}(root, args, context, ast) {
      ${mutationStart({ objName, op: "update" })}
      return await resolverHelpers.runMutation(session, transaction, async() => {
        let { $match, $project } = decontructGraphqlQuery({ _id_in: args._ids }, ast, ${objName}Metadata, "${pluralize(objName)}");
        let updates = await getUpdateObject(args.Updates || {}, ${objName}Metadata, { ...gqlPacket, db, session });

        if (await runHook("beforeUpdate", $match, updates, { ...gqlPacket, db, session }) === false) {
          return { success: true };
        }
        await setUpOneToManyRelationshipsForUpdate(args._ids, args, ${objName}Metadata, { ...gqlPacket, db, session });
        await dbHelpers.runUpdate(db, "${table}", $match, updates, { session });
        await runHook("afterUpdate", $match, updates, { ...gqlPacket, db, session });
        ${mutationComplete()}

        let result = $project ? await load${pluralize(objName)}(db, { $match, $project }, root, args, context, ast) : null;
        return resolverHelpers.mutationSuccessResult({ ${pluralize(objName)}: result, transaction, elapsedTime: 0 });
      });
    }`;
