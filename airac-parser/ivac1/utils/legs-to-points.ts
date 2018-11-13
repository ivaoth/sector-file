const logKnownLegTypes = false;

export const legsToPoints = (legs: { leg_id: number; type: string; fix_ident: string; }[]) => {
  const points: string[] = [];
  for (const leg of legs) {
    switch (leg.type) {
      case 'CA':
        // TODO: implement this leg type
        logKnownLegTypes &&
          console.log('>>> Course to altitude: no action (yet)');
        break;
      case 'DF':
        logKnownLegTypes &&
          console.log(`>>> (${leg.leg_id}) Direct to fix: ${leg.fix_ident}`);
        points.push(leg.fix_ident);
        break;
      case 'TF':
        logKnownLegTypes &&
          console.log(`>>> (${leg.leg_id}) Track to fix: ${leg.fix_ident}`);
        points.push(leg.fix_ident);
        break;
      case 'CF':
        logKnownLegTypes &&
          console.log(`>>> (${leg.leg_id}) Course to fix: ${leg.fix_ident}`);
        points.push(leg.fix_ident);
        break;
      case 'IF':
        logKnownLegTypes &&
          console.log(`>>> (${leg.leg_id}) Initial fix: ${leg.fix_ident}`);
        points.push(leg.fix_ident);
        break;
      case 'VM':
        logKnownLegTypes &&
          console.log(`>>> (${leg.leg_id}) Heading to manual termination: no action`);
        break;
      default:
        console.log(`>>> (${leg.leg_id}) ***UNKNOWN LEG TYPE ${leg.type}***`);
    }
  }
  return points;
}
