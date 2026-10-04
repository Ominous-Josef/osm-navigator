import { InvalidResponseError } from "../../errors";
import { decodePolyline } from "../polyline";

describe("decodePolyline", () => {
  it("decodes the reference precision-5 example from the polyline spec", () => {
    // https://developers.google.com/maps/documentation/utilities/polylinealgorithm
    expect(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@", 5)).toEqual([
      [-120.2, 38.5],
      [-120.95, 40.7],
      [-126.453, 43.252],
    ]);
  });

  it("decodes precision 6 by default", () => {
    // Same points as above, encoded at 1e6.
    expect(decodePolyline("_izlhA~rlgdF_{geC~ywl@_kwzCn`{nI")).toEqual([
      [-120.2, 38.5],
      [-120.95, 40.7],
      [-126.453, 43.252],
    ]);
  });

  it("returns an empty list for an empty string", () => {
    expect(decodePolyline("")).toEqual([]);
  });

  it("throws on a truncated string", () => {
    expect(() => decodePolyline("_izlhA~rlgdF_{geC~ywl@_kwzCn`{n")).toThrow(InvalidResponseError);
  });

  it("throws on characters outside the encoding range", () => {
    expect(() => decodePolyline("_izlhA ")).toThrow(InvalidResponseError);
  });
});
