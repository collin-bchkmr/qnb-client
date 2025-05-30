import { useState, FormEvent, useEffect, useId } from "react";
import { useNavigate } from "react-router-dom";

// Config
import { MAX_ROUTE_DISPLAY } from "@Config/limits";

// Types
import type {
  RouteDetail,
  RouteListResponse,
  RouteVanityResponse,
} from "@Types/Routes";
import type DBFavorite from "../db/type/DBFavorite";
import type DBRecent from "../db/type/DBRecent";

// Utils
import { favoritesTable, recentTable } from "../db";
import { toast } from "react-toastify";

// Assets
import { SearchIcon } from "lucide-react";

// Components
import Divider from "@Components/Divider";
import FullCard from "@Components/cards/FullCard";
import QuickCard from "@Components/cards/QuickCard";
import FullCardSkeleton from "@Components/skeleton/FullCardSkeleton";
import Spinner from "@Components/Spinner";

export default function MainPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [featured, setFeatured] = useState<RouteDetail[] | null>(null);
  const [favorite, setFavorite] = useState<DBFavorite[] | null>(null);
  const [recent, setRecent] = useState<DBRecent[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Component id
  const id = useId();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const queryString = query.trim();
    if (queryString.length === 0) {
      return;
    }
    const regexId =
      /^(?:https:\/\/(www\.)?qiqis-notebook\.com\/route\/)?([0-9a-fA-F]{24})$/;
    let match = queryString.match(regexId);

    // If it's a route id, launch the route
    if (match) {
      navigate(`/route/${match[2]}`);
    } else {
      // If it's a route vanity, get route id and launch the route
      const regexVanity =
        /^(?:https:\/\/(www\.)?qiqis-notebook\.com\/r\/)([a-zA-Z0-9-_.]{1,50})$/;
      match = queryString.match(regexVanity);
      if (match) {
        // Resolve vanity link
        setLoading(true);
        try {
          // Send a message to the main process to fetch data
          window.electron.ipcRenderer
            .getData<RouteVanityResponse>(
              `/gateway/vanity/route?vanity=${match[2]}`,
              id
            )
            .then((resp) => {
              if (resp && resp.data) {
                const vanityId = resp.data.data;
                setLoading(false);
                navigate(`/route/${vanityId}`);
              } else {
                setLoading(false);
                toast.error("Route not found");
              }
            });
        } catch (error) {
          console.error("Error fetching data:", error.message);
          toast.error(error);
          setLoading(false);
        }
      } else {
        // Route query
        navigate(`/routes/search?query=${encodeURI(query)}`);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchData = async (apiUrl: string, requestId: string) => {
      try {
        // Send a message to the main process to fetch data
        window.electron.ipcRenderer
          .getData<RouteListResponse>(apiUrl, requestId)
          .then((resp) => {
            if (isMounted) {
              if (resp && resp.data) {
                setFeatured(resp.data.data);
              } else {
                setFeatured([]);
              }
            }
          });
      } catch (error) {
        console.error("Error fetching data:", error.message);
        toast.error(error);
        if (isMounted) {
          setFeatured([]);
        }
      }
    };
    const fetchFavorites = async () => {
      const favorites = await favoritesTable.toArray();
      const sortedFavorites = favorites.sort((a, b) => {
        if (a.pinned === b.pinned) {
          return b.added.getTime() - a.added.getTime();
        }
        return a.pinned ? -1 : 1;
      });
      return sortedFavorites.slice(0, MAX_ROUTE_DISPLAY);
    };
    const fetchRecent = async () => {
      return await recentTable
        .orderBy("added")
        .reverse()
        .limit(MAX_ROUTE_DISPLAY)
        .toArray();
    };

    fetchData("/gateway/featured-routes", id);
    Promise.all([fetchFavorites(), fetchRecent()])
      .then(([favoritesData, recentData]) => {
        if (isMounted) {
          setFavorite(favoritesData);
          setRecent(recentData);
        }
      })
      .catch((error) => {
        console.error("Error fetching data:", error.message);
        toast.error(error);
      });

    return () => {
      isMounted = false;
      window.electron.ipcRenderer.abortRequest(id);
    };
  }, []);

  return (
    <div className="flex flex-col gap-2 grow p-2 overflow-y-auto">
      <div className="flex items-center">
        <form className="w-full relative" onSubmit={onSubmit}>
          <input
            type="text"
            placeholder="Search title/id/url"
            className="input input-bordered w-full"
            disabled={loading}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute inset-y-0 right-0 px-2"
          >
            {loading ? <Spinner /> : <SearchIcon className="h-6 w-6" />}
          </button>
        </form>
      </div>
      {/* Featured */}
      <div className="h-auto space-y-1">
        <div className="w-full text-center">Featured Routes</div>
        <Divider />
        {featured === null ? (
          <div className="grid items-start gap-3 grid-cols-3">
            <FullCardSkeleton />
            <FullCardSkeleton />
            <FullCardSkeleton />
          </div>
        ) : featured.length > 0 ? (
          <div className="grid items-start gap-3 grid-cols-3">
            {featured.map((item, idx) => (
              <FullCard route={item} key={`fr-${idx}`} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-base-200 flex items-center justify-center h-[260px]">
            No Data
          </div>
        )}
      </div>
      {/* Quick routes */}
      <div className="w-full grid grid-cols-2 gap-2">
        <div className="flex flex-col space-y-1">
          <div className="w-full text-center">Favorite</div>
          <Divider />
          {favorite === null ? (
            <div></div>
          ) : favorite.length > 0 ? (
            <div className="gap-2 flex flex-col">
              {favorite.map((item, idx) => (
                <QuickCard route={item} key={`fav-${idx}`} recent={false} />
              ))}
            </div>
          ) : (
            <div className="text-center">No Favorites</div>
          )}
        </div>
        <div className="space-y-1">
          <div className="w-full text-center">Recent</div>
          <Divider />
          {recent === null ? (
            <div></div>
          ) : recent.length > 0 ? (
            <div className="flex flex-col gap-2">
              {recent.map((item, idx) => (
                <QuickCard route={item} key={`rec-${idx}`} />
              ))}
            </div>
          ) : (
            <div className="text-center">No Recent</div>
          )}
        </div>
      </div>
    </div>
  );
}
