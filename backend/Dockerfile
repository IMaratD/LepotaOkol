# FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
# WORKDIR /app
# EXPOSE 80

# FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
# WORKDIR /src
# COPY . .
# RUN dotnet restore "./backend.csproj"
# RUN dotnet build "./backend.csproj" -c Release -o /app/build
# RUN dotnet publish "./backend.csproj" -c Release -o /app/publish

# FROM base AS final
# WORKDIR /app
# COPY --from=build /app/publish .
# ENTRYPOINT ["dotnet", "backend.dll"]

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 5000
EXPOSE 5001

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["backend.csproj", "./"]
RUN dotnet restore "./backend.csproj"
COPY . .
WORKDIR "/src/"
RUN dotnet build "backend.csproj" -c Release -o /app/build
RUN dotnet publish "backend.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "backend.dll"]
