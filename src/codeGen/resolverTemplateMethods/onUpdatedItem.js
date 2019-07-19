export default ({ objName }) =>`
    on${objName}Updated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['${objName}_UPDATED']),
        (payload, variables) => {
          return payload.on${objName}Updated._id === variables._id;
        },
      ),
    }`;
